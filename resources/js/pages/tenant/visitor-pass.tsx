import { Head } from '@inertiajs/react';
import {
    Car,
    Check,
    Clock,
    Copy,
    Link as LinkIcon,
    Loader2,
    MessageCircle,
    Plus,
    QrCode,
    X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Mirrors the visitor_passes table. `token` is the QR payload and also
// what /pass/{token} (a separate guest-facing page, not built yet) resolves.

type PassStatus = 'pending' | 'used' | 'cancelled';

type VisitorPass = {
    id: number;
    guestName: string;
    guestPhone: string | null;
    vehicleInfo: string | null;
    purpose: string | null;
    token: string;
    status: PassStatus;
    validFrom: string; // ISO
    validUntil: string; // ISO
};

const dummyPasses: VisitorPass[] = [
    {
        id: 1,
        guestName: 'Andi Wijaya',
        guestPhone: '628123456789',
        vehicleInfo: 'B 1234 XYZ',
        purpose: 'Kunjungan keluarga',
        token: 'b7e2c1a0-1111-4a2b-9c3d-000000000001',
        status: 'pending',
        validFrom: '2026-09-17T14:00:00',
        validUntil: '2026-09-17T18:00:00',
    },
    {
        id: 2,
        guestName: 'Kurir JNE',
        guestPhone: null,
        vehicleInfo: null,
        purpose: 'Pengiriman paket',
        token: 'b7e2c1a0-1111-4a2b-9c3d-000000000002',
        status: 'pending',
        validFrom: '2026-09-17T09:00:00',
        validUntil: '2026-09-17T17:00:00',
    },
    {
        id: 3,
        guestName: 'Rina Marlina',
        guestPhone: '628987654321',
        vehicleInfo: null,
        purpose: 'Arisan RT',
        token: 'b7e2c1a0-1111-4a2b-9c3d-000000000003',
        status: 'used',
        validFrom: '2026-09-15T15:00:00',
        validUntil: '2026-09-15T20:00:00',
    },
    {
        id: 4,
        guestName: 'Sopir Grab',
        guestPhone: null,
        vehicleInfo: 'B 5678 ABC',
        purpose: null,
        token: 'b7e2c1a0-1111-4a2b-9c3d-000000000004',
        status: 'cancelled',
        validFrom: '2026-09-14T10:00:00',
        validUntil: '2026-09-14T11:00:00',
    },
];

function isExpired(pass: VisitorPass, now: Date) {
    return pass.status === 'pending' && new Date(pass.validUntil) < now;
}

function formatWindow(validFrom: string, validUntil: string) {
    const from = new Date(validFrom);
    const until = new Date(validUntil);
    const sameDay = from.toDateString() === until.toDateString();
    const timeFmt = (d: Date) =>
        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateFmt = (d: Date) =>
        d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

    if (sameDay) {
        return `${dateFmt(from)}, ${timeFmt(from)} - ${timeFmt(until)}`;
    }

    return `${dateFmt(from)} ${timeFmt(from)} - ${dateFmt(until)} ${timeFmt(until)}`;
}

export default function TenantVisitorPass() {
    const [passes, setPasses] = useState<VisitorPass[]>(dummyPasses);
    const [tab, setTab] = useState<'active' | 'history'>('active');
    const [createOpen, setCreateOpen] = useState(false);
    const [shareTarget, setShareTarget] = useState<VisitorPass | null>(null);
    const now = new Date();

    const active = passes.filter(
        (p) => p.status === 'pending' && !isExpired(p, now),
    );
    const history = passes.filter(
        (p) => p.status !== 'pending' || isExpired(p, now),
    );

    function handleCreated(pass: VisitorPass) {
        setPasses((prev) => [pass, ...prev]);
        setCreateOpen(false);
        setShareTarget(pass);
    }

    function cancelPass(id: number) {
        setPasses((prev) =>
            prev.map((p) => {
                if (p.id !== id) {
                    return p;
                }

                return { ...p, status: 'cancelled' as const };
            }),
        );
    }

    return (
        <>
            <Head title="Tamu" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-surface) pb-[env(safe-area-inset-bottom)]">
                <PageHeader
                    title="Tamu"
                    backHref="/tenant"
                    tone="tenant"
                    rightSlot={
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
                            aria-label="Buat pass baru"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    }
                />

                {/* Tabs */}
                <div className="flex gap-1 px-5 pt-4">
                    <TabButton
                        active={tab === 'active'}
                        onClick={() => setTab('active')}
                        label={`Aktif (${active.length})`}
                    />
                    <TabButton
                        active={tab === 'history'}
                        onClick={() => setTab('history')}
                        label="Riwayat"
                    />
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto px-5 pt-4 pb-24">
                    {tab === 'active' && active.length === 0 && (
                        <EmptyState message="Belum ada pass aktif. Buat pass untuk tamu Anda." />
                    )}

                    {tab === 'history' && history.length === 0 && (
                        <EmptyState message="Belum ada riwayat pass." />
                    )}

                    {(tab === 'active' ? active : history).map((pass) => (
                        <PassCard
                            key={pass.id}
                            pass={pass}
                            expired={isExpired(pass, now)}
                            onShare={() => setShareTarget(pass)}
                            onCancel={() => cancelPass(pass.id)}
                        />
                    ))}
                </div>

                <Button
                    onClick={() => setCreateOpen(true)}
                    className="fixed inset-x-5 bottom-5 mx-auto h-13 max-w-sm bg-(--color-sky-deep) text-base hover:bg-(--color-sky-deep)/90"
                >
                    <Plus className="h-5 w-5" />
                    Buat Pass Tamu
                </Button>
            </div>

            {createOpen && (
                <CreatePassSheet
                    onClose={() => setCreateOpen(false)}
                    onCreated={handleCreated}
                />
            )}

            {shareTarget && (
                <SharePassSheet
                    pass={shareTarget}
                    onClose={() => setShareTarget(null)}
                />
            )}
        </>
    );
}

function TabButton({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                active
                    ? 'bg-(--color-ink) text-(--color-surface)'
                    : 'bg-(--color-ink)/6 text-(--color-ink)/60'
            }`}
        >
            {label}
        </button>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center gap-2 pt-16 text-center">
            <QrCode className="h-8 w-8 text-(--color-ink)/25" />
            <p className="text-sm text-(--color-ink)/45">{message}</p>
        </div>
    );
}

const statusBadge: Record<
    PassStatus | 'expired',
    { label: string; className: string }
> = {
    pending: {
        label: 'Aktif',
        className: 'bg-(--color-mint)/12 text-(--color-mint-deep)',
    },
    used: {
        label: 'Digunakan',
        className: 'bg-(--color-sky)/15 text-(--color-sky-deep)',
    },
    cancelled: {
        label: 'Dibatalkan',
        className: 'bg-(--color-ink)/8 text-(--color-ink)/45',
    },
    expired: { label: 'Kedaluwarsa', className: 'bg-amber-100 text-amber-600' },
};

function PassCard({
    pass,
    expired,
    onShare,
    onCancel,
}: {
    pass: VisitorPass;
    expired: boolean;
    onShare: () => void;
    onCancel: () => void;
}) {
    const badgeKey = expired ? 'expired' : pass.status;
    const badge = statusBadge[badgeKey];
    const isActive = pass.status === 'pending' && !expired;

    return (
        <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-4">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-(--color-ink)">
                        {pass.guestName}
                    </p>
                    {pass.purpose && (
                        <p className="mt-0.5 truncate text-xs text-(--color-ink)/50">
                            {pass.purpose}
                        </p>
                    )}
                </div>
                <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}
                >
                    {badge.label}
                </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-(--color-ink)/45">
                <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatWindow(pass.validFrom, pass.validUntil)}
                </span>

                {pass.vehicleInfo && (
                    <span className="flex items-center gap-1">
                        <Car className="h-3.5 w-3.5" />
                        {pass.vehicleInfo}
                    </span>
                )}
            </div>

            {isActive && (
                <div className="mt-3 flex gap-2">
                    <Button
                        variant="outline"
                        className="h-9 flex-1 text-xs"
                        onClick={onShare}
                    >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Bagikan
                    </Button>
                    <Button
                        variant="outline"
                        className="h-9 flex-1 text-xs text-red-600 hover:text-red-600"
                        onClick={onCancel}
                    >
                        <X className="h-3.5 w-3.5" />
                        Batalkan
                    </Button>
                </div>
            )}
        </div>
    );
}

function CreatePassSheet({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: (pass: VisitorPass) => void;
}) {
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [vehicleInfo, setVehicleInfo] = useState('');
    const [purpose, setPurpose] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function submit() {
        if (!guestName.trim()) {
            return;
        }

        setSubmitting(true);

        // Dummy create — swap for a real POST /tenant/visitor-pass call,
        // which should return the created row including its token.
        setTimeout(() => {
            const now = new Date();
            const until = new Date(now.getTime() + 4 * 60 * 60 * 1000);

            onCreated({
                id: Date.now(),
                guestName: guestName.trim(),
                guestPhone: guestPhone.trim() || null,
                vehicleInfo: vehicleInfo.trim() || null,
                purpose: purpose.trim() || null,
                token: crypto.randomUUID(),
                status: 'pending',
                validFrom: now.toISOString(),
                validUntil: until.toISOString(),
            });

            setSubmitting(false);
        }, 500);
    }

    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <p className="mb-4 text-base font-semibold text-(--color-ink)">
                    Buat Pass Tamu
                </p>

                <div className="space-y-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="guest-name">Nama tamu</Label>
                        <Input
                            id="guest-name"
                            autoFocus
                            placeholder="cth. Andi Wijaya"
                            className="h-12 text-base"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="guest-phone">
                            No. HP tamu (opsional)
                        </Label>
                        <Input
                            id="guest-phone"
                            type="tel"
                            placeholder="08xxxxxxxxxx"
                            className="h-12 text-base"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="vehicle">Kendaraan (opsional)</Label>
                        <Input
                            id="vehicle"
                            placeholder="cth. B 1234 XYZ"
                            className="h-12 text-base"
                            value={vehicleInfo}
                            onChange={(e) => setVehicleInfo(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="purpose">Keperluan (opsional)</Label>
                        <Textarea
                            id="purpose"
                            placeholder="cth. Kunjungan keluarga"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-5 flex gap-2">
                    <Button
                        variant="outline"
                        className="h-12 flex-1"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Batal
                    </Button>
                    <Button
                        className="h-12 flex-1"
                        onClick={submit}
                        disabled={!guestName.trim() || submitting}
                    >
                        {submitting && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Buat Pass
                    </Button>
                </div>
            </div>
        </div>
    );
}

function SharePassSheet({
    pass,
    onClose,
}: {
    pass: VisitorPass;
    onClose: () => void;
}) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // The token resolves to a guest-facing page (not built yet) showing this
    // same QR full-screen — that page is what the link below points to.
    const passUrl = `${window.location.origin}/pass/${pass.token}`;

    useEffect(() => {
        QRCode.toDataURL(passUrl, { width: 220, margin: 1 }).then(setQrDataUrl);
    }, [passUrl]);

    function shareViaWhatsapp() {
        const message = `Halo ${pass.guestName}, berikut pass kunjungan Anda:\n${passUrl}\n\nBerlaku: ${formatWindow(
            pass.validFrom,
            pass.validUntil,
        )}`;

        const phone = pass.guestPhone ? pass.guestPhone.replace(/\D/g, '') : '';
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        window.open(waUrl, '_blank');
    }

    function copyLink() {
        navigator.clipboard.writeText(passUrl);
        setCopied(true);

        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <div className="flex flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--color-mint)/15 text-(--color-mint-deep)">
                        <Check className="h-6 w-6" />
                    </div>
                    <p className="mt-2 text-base font-semibold text-(--color-ink)">
                        Pass Berhasil Dibuat
                    </p>
                    <p className="text-sm text-(--color-ink)/50">
                        {pass.guestName}
                    </p>

                    <div className="mt-4 flex h-56 w-56 items-center justify-center rounded-2xl border border-(--color-ink)/8 bg-white p-3">
                        {qrDataUrl ? (
                            <img
                                src={qrDataUrl}
                                alt="QR pass tamu"
                                className="h-full w-full"
                            />
                        ) : (
                            <Loader2 className="h-6 w-6 animate-spin text-(--color-ink)/30" />
                        )}
                    </div>

                    <p className="mt-3 text-xs text-(--color-ink)/45">
                        {formatWindow(pass.validFrom, pass.validUntil)}
                    </p>
                </div>

                <div className="mt-5 space-y-2">
                    <Button
                        onClick={shareViaWhatsapp}
                        className="h-12 w-full bg-[#25D366] text-base hover:bg-[#25D366]/90"
                    >
                        <MessageCircle className="h-5 w-5" />
                        Bagikan via WhatsApp
                    </Button>

                    <Button
                        variant="outline"
                        className="h-11 w-full text-sm"
                        onClick={copyLink}
                    >
                        {copied ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        {copied ? 'Link disalin' : 'Salin link'}
                    </Button>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm text-(--color-ink)/45"
                >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Selesai
                </button>
            </div>
        </div>
    );
}

TenantVisitorPass.layout = (page: React.ReactNode) => page;
