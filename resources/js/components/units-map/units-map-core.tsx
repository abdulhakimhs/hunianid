import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    Loader2,
    MapPin,
    Phone,
    Receipt,
    Ticket as TicketIcon,
    UserPlus,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { loadGoogleMaps } from '@/lib/google-maps';

export type MapUnit = {
    id: number;
    unitNumber: string;
    block: string | null;
    label: string;
    status: 'active' | 'inactive';
    latitude: number | null;
    longitude: number | null;
    hasPin: boolean;
    resident: { name: string; phone: string | null; relation: string } | null;
    familyMemberCount: number;
    openTicketCount: number;
    overdueInvoiceCount: number;
    visitorsTodayCount: number;
    activePanicAlert: {
        id: number;
        reason: string | null;
        triggeredAt: string;
        tenantName: string | null;
    } | null;
};

type Props = {
    initialUnits: MapUnit[];
    initialUnpinnedCount: number;
    complexCenter: { lat: number; lng: number };
    pollUrl: string;
};

function xsrfToken(): string {
    return decodeURIComponent(
        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '',
    );
}

function severity(unit: MapUnit): 'panic' | 'alert' | 'normal' {
    if (unit.activePanicAlert) {
        return 'panic';
    }

    if (unit.openTicketCount > 0 || unit.overdueInvoiceCount > 0) {
        return 'alert';
    }

    return 'normal';
}

function markerColorClasses(sev: ReturnType<typeof severity>): {
    bg: string;
    text: string;
} {
    if (sev === 'panic') {
        return { bg: 'bg-(--color-coral)', text: 'text-white' };
    }

    if (sev === 'alert') {
        return { bg: 'bg-(--color-coral)/85', text: 'text-white' };
    }

    return { bg: 'bg-(--color-mint)', text: 'text-white' };
}

function buildMarkerContent(unit: MapUnit): HTMLDivElement {
    const sev = severity(unit);
    const colors = markerColorClasses(sev);

    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col items-center cursor-pointer select-none';

    const pulse = document.createElement('div');
    pulse.className =
        sev === 'panic'
            ? 'absolute -z-10 h-10 w-10 rounded-full bg-(--color-coral)/50 animate-ping'
            : 'hidden';

    const pill = document.createElement('div');
    pill.className = `relative shadow-elevated flex items-center gap-1 rounded-full border-2 border-white px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${colors.bg} ${colors.text}`;
    pill.textContent = unit.label || unit.unitNumber;

    const badgeCount = unit.openTicketCount + unit.overdueInvoiceCount;

    if (badgeCount > 0) {
        const badge = document.createElement('span');
        badge.className =
            'absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-(--color-ink) text-[9px] font-bold text-white';
        badge.textContent = String(Math.min(badgeCount, 9));
        pill.appendChild(badge);
    }

    const tail = document.createElement('div');
    tail.className = `-mt-1 h-2.5 w-2.5 rotate-45 border-r-2 border-b-2 border-white ${colors.bg}`;

    wrapper.style.position = 'relative';
    wrapper.appendChild(pulse);
    wrapper.appendChild(pill);
    wrapper.appendChild(tail);

    return wrapper;
}

export function UnitsMapCore({
    initialUnits,
    initialUnpinnedCount,
    complexCenter,
    pollUrl,
}: Props) {
    const [units, setUnits] = useState<MapUnit[]>(initialUnits);
    const [unpinnedCount, setUnpinnedCount] = useState(initialUnpinnedCount);
    const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
    const [ticketForm, setTicketForm] = useState({
        subject: '',
        category: 'maintenance',
    });
    const [ticketSubmitting, setTicketSubmitting] = useState(false);
    const [inviteForm, setInviteForm] = useState({ name: '', phone: '' });
    const [inviteSubmitting, setInviteSubmitting] = useState(false);
    const [resolving, setResolving] = useState(false);

    const mapDivRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());

    const selectedUnit = useMemo(
        () => units.find((u) => u.id === selectedUnitId) ?? null,
        [units, selectedUnitId],
    );

    // Builds/refreshes every marker from the current `units` state without tearing
    // down and recreating markers that already exist — keeps polling ticks visually
    // quiet (no flicker) instead of a full re-render every ~12s.
    function syncMarkers(map: google.maps.Map, list: MapUnit[]) {
        const seen = new Set<number>();

        for (const unit of list) {
            if (!unit.hasPin || unit.latitude === null || unit.longitude === null) {
                continue;
            }

            seen.add(unit.id);
            const position = { lat: unit.latitude, lng: unit.longitude };
            const existing = markersRef.current.get(unit.id);

            if (existing) {
                existing.position = position;
                existing.content = buildMarkerContent(unit);

                continue;
            }

            const marker = new google.maps.marker.AdvancedMarkerElement({
                map,
                position,
                content: buildMarkerContent(unit),
            });

            marker.addListener('click', () => setSelectedUnitId(unit.id));
            markersRef.current.set(unit.id, marker);
        }

        for (const [id, marker] of markersRef.current.entries()) {
            if (!seen.has(id)) {
                marker.map = null;
                markersRef.current.delete(id);
            }
        }
    }

    useEffect(() => {
        let cancelled = false;

        loadGoogleMaps().then((google) => {
            if (cancelled || !mapDivRef.current) {
                return;
            }

            const map = new google.maps.Map(mapDivRef.current, {
                center: complexCenter,
                zoom: 17,
                mapId: 'DEMO_MAP_ID',
                mapTypeControl: true,
                mapTypeId: google.maps.MapTypeId.SATELLITE,
                streetViewControl: false,
                fullscreenControl: true,
            });

            mapRef.current = map;
            syncMarkers(map, units);
        });

        return () => {
            cancelled = true;
            markersRef.current.forEach((m) => (m.map = null));
            markersRef.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (mapRef.current) {
            syncMarkers(mapRef.current, units);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [units]);

    // No broadcasting/websocket infra exists in this project yet — short-interval
    // polling is the pragmatic v1 way to keep the map "live" (new panic alerts,
    // updated ticket/invoice counts) without a manual page refresh.
    useEffect(() => {
        const interval = setInterval(() => {
            fetch(pollUrl, { headers: { Accept: 'application/json' } })
                .then((r) => r.json())
                .then((data: { units: MapUnit[]; unpinnedCount: number }) => {
                    setUnits(data.units);
                    setUnpinnedCount(data.unpinnedCount);
                })
                .catch(() => {
                    // Transient network hiccup — next tick tries again.
                });
        }, 12000);

        return () => clearInterval(interval);
    }, [pollUrl]);

    function closeDetail() {
        setSelectedUnitId(null);
        setTicketForm({ subject: '', category: 'maintenance' });
        setInviteForm({ name: '', phone: '' });
    }

    function submitTicket() {
        if (!selectedUnit || !ticketForm.subject.trim()) {
            return;
        }

        setTicketSubmitting(true);

        fetch(`/admin/units-map/${selectedUnit.id}/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': xsrfToken(),
            },
            body: JSON.stringify(ticketForm),
        })
            .then(async (r) => {
                if (!r.ok) {
                    const data = await r.json().catch(() => null);
                    throw new Error(data?.message ?? 'Gagal membuat tiket.');
                }

                toast.success('Tiket berhasil dibuat.');
                setTicketForm({ subject: '', category: 'maintenance' });
            })
            .catch((err: Error) => toast.error(err.message))
            .finally(() => setTicketSubmitting(false));
    }

    function submitInvite() {
        if (!selectedUnit || !inviteForm.phone.trim()) {
            return;
        }

        setInviteSubmitting(true);

        router.post(
            '/admin/invites/tenant',
            {
                unit_id: selectedUnit.id,
                name: inviteForm.name.trim() || undefined,
                phone: inviteForm.phone.trim(),
            },
            {
                onSuccess: () => {
                    toast.success('Undangan berhasil dikirim.');
                    closeDetail();
                },
                onError: () => toast.error('Gagal mengirim undangan.'),
                onFinish: () => setInviteSubmitting(false),
            },
        );
    }

    function resolvePanic() {
        if (!selectedUnit?.activePanicAlert) {
            return;
        }

        setResolving(true);

        fetch(`/admin/panic-alerts/${selectedUnit.activePanicAlert.id}/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': xsrfToken(),
            },
        })
            .then((r) => {
                if (!r.ok) {
                    throw new Error();
                }

                setUnits((prev) =>
                    prev.map((u) =>
                        u.id === selectedUnit.id
                            ? { ...u, activePanicAlert: null }
                            : u,
                    ),
                );
                toast.success('Panic alert ditandai selesai.');
            })
            .catch(() => toast.error('Gagal menandai panic alert selesai.'))
            .finally(() => setResolving(false));
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-3">
            {unpinnedCount > 0 && (
                <button
                    type="button"
                    onClick={() => router.visit('/admin/units')}
                    className="shadow-elevated flex items-center gap-2 rounded-2xl border border-(--color-sky)/25 bg-(--color-sky)/10 px-4 py-2.5 text-left text-sm text-(--color-sky-deep) transition hover:bg-(--color-sky)/15"
                >
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>
                        <span className="font-semibold">{unpinnedCount}</span>{' '}
                        unit belum ditandai di peta — buka Kelola Unit untuk
                        menandai lokasinya.
                    </span>
                </button>
            )}

            <div
                ref={mapDivRef}
                className="shadow-elevated min-h-[480px] flex-1 overflow-hidden rounded-2xl border border-(--color-ink)/8"
            />

            <Dialog open={!!selectedUnit} onOpenChange={(open) => !open && closeDetail()}>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Unit {selectedUnit?.label}</DialogTitle>
                        <DialogDescription>
                            Detail penghuni dan aksi cepat untuk unit ini.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUnit && (
                        <div className="grid gap-4">
                            {selectedUnit.activePanicAlert && (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-(--color-coral)/30 bg-(--color-coral)/10 px-3.5 py-3">
                                    <div className="flex items-center gap-2 text-(--color-coral)">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        <span className="text-sm font-medium">
                                            Panic alert aktif
                                            {selectedUnit.activePanicAlert
                                                .tenantName
                                                ? ` — ${selectedUnit.activePanicAlert.tenantName}`
                                                : ''}
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={resolving}
                                        onClick={resolvePanic}
                                    >
                                        {resolving && (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        )}
                                        Tandai Selesai
                                    </Button>
                                </div>
                            )}

                            <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                                <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                    Penghuni
                                </p>
                                {selectedUnit.resident ? (
                                    <div className="mt-1 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-(--color-ink)">
                                                {selectedUnit.resident.name}
                                            </p>
                                            {selectedUnit.resident.phone && (
                                                <p className="flex items-center gap-1 text-xs text-(--color-ink)/50">
                                                    <Phone className="h-3 w-3" />
                                                    {selectedUnit.resident.phone}
                                                </p>
                                            )}
                                        </div>
                                        <span className="flex items-center gap-1 text-xs text-(--color-ink)/45">
                                            <Users className="h-3.5 w-3.5" />
                                            {selectedUnit.familyMemberCount}{' '}
                                            orang
                                        </span>
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm text-(--color-ink)/50">
                                        Belum ada penghuni aktif.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3 py-2.5 text-center">
                                    <p className="text-lg font-bold text-(--color-ink)">
                                        {selectedUnit.openTicketCount}
                                    </p>
                                    <p className="text-[11px] text-(--color-ink)/50">
                                        Tiket terbuka
                                    </p>
                                </div>
                                <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3 py-2.5 text-center">
                                    <p className="text-lg font-bold text-(--color-ink)">
                                        {selectedUnit.overdueInvoiceCount}
                                    </p>
                                    <p className="text-[11px] text-(--color-ink)/50">
                                        Tagihan menunggak
                                    </p>
                                </div>
                                <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3 py-2.5 text-center">
                                    <p className="text-lg font-bold text-(--color-ink)">
                                        {selectedUnit.visitorsTodayCount}
                                    </p>
                                    <p className="text-[11px] text-(--color-ink)/50">
                                        Tamu hari ini
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-2 rounded-xl border border-(--color-ink)/8 px-3.5 py-3">
                                <p className="text-sm font-medium text-(--color-ink)">
                                    Buat tiket untuk unit ini
                                </p>
                                <Input
                                    placeholder="Subjek laporan"
                                    value={ticketForm.subject}
                                    onChange={(e) =>
                                        setTicketForm({
                                            ...ticketForm,
                                            subject: e.target.value,
                                        })
                                    }
                                />
                                <div className="flex gap-2">
                                    <Select
                                        value={ticketForm.category}
                                        onValueChange={(v) =>
                                            setTicketForm({
                                                ...ticketForm,
                                                category: v,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="maintenance">
                                                Perbaikan
                                            </SelectItem>
                                            <SelectItem value="security">
                                                Keamanan
                                            </SelectItem>
                                            <SelectItem value="cleanliness">
                                                Kebersihan
                                            </SelectItem>
                                            <SelectItem value="other">
                                                Lainnya
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        disabled={
                                            !ticketForm.subject.trim() ||
                                            !selectedUnit.resident ||
                                            ticketSubmitting
                                        }
                                        onClick={submitTicket}
                                    >
                                        {ticketSubmitting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <TicketIcon className="h-4 w-4" />
                                        )}
                                        Buat
                                    </Button>
                                </div>
                                {!selectedUnit.resident && (
                                    <p className="text-xs text-(--color-ink)/40">
                                        Unit belum punya penghuni aktif — undang
                                        pemilik dahulu.
                                    </p>
                                )}
                            </div>

                            {!selectedUnit.resident && (
                                <div className="grid gap-2 rounded-xl border border-(--color-ink)/8 px-3.5 py-3">
                                    <p className="text-sm font-medium text-(--color-ink)">
                                        Undang pemilik
                                    </p>
                                    <Input
                                        placeholder="Nama (opsional)"
                                        value={inviteForm.name}
                                        onChange={(e) =>
                                            setInviteForm({
                                                ...inviteForm,
                                                name: e.target.value,
                                            })
                                        }
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="No. HP"
                                            value={inviteForm.phone}
                                            onChange={(e) =>
                                                setInviteForm({
                                                    ...inviteForm,
                                                    phone: e.target.value,
                                                })
                                            }
                                        />
                                        <Button
                                            disabled={
                                                !inviteForm.phone.trim() ||
                                                inviteSubmitting
                                            }
                                            onClick={submitInvite}
                                        >
                                            {inviteSubmitting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <UserPlus className="h-4 w-4" />
                                            )}
                                            Undang
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() =>
                                selectedUnit &&
                                router.visit(
                                    `/admin/invoices/create?unit_id=${selectedUnit.id}`,
                                )
                            }
                            disabled={!selectedUnit?.resident}
                        >
                            <Receipt className="h-4 w-4" />
                            Buat Tagihan
                        </Button>
                        <Button variant="outline" onClick={closeDetail}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
