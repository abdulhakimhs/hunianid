import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    Link2,
    Loader2,
    MessageCircle,
    RefreshCw,
    Search,
    Send,
    ShieldCheck,
    Users,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Invite = { id: number; code: string; status: string } | null;
type Unit = { id: number; label: string };
type TenantInvite = {
    id: number;
    phone: string;
    unit: string;
    status: 'active' | 'expired' | 'revoked' | 'accepted';
    send_status: 'pending' | 'sent' | 'failed';
    scheduled_at: string | null;
    sent_at: string | null;
    send_error: string | null;
    created_at: string;
};

type Props = {
    invite: Invite;
    areaName: string;
    frame?: 'pengelola' | 'resident' | null;
    tenantInvites: TenantInvite[];
    units: Unit[];
    showPengurusTab: boolean;
};

type Tab = 'warga' | 'pengurus';

function formatDateTime(iso: string | null): string {
    if (!iso) {
        return '—';
    }

    return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ invite }: { invite: TenantInvite }) {
    if (invite.status === 'accepted') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-mint)]/25 bg-[color:var(--color-mint)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--color-mint-deep)]">
                <Check className="h-3 w-3" /> Diterima
            </span>
        );
    }

    if (invite.status === 'revoked') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-ink)]/10 bg-[color:var(--color-ink)]/5 px-2.5 py-1 text-xs font-semibold text-[color:var(--color-ink)]/50">
                <X className="h-3 w-3" /> Dibatalkan
            </span>
        );
    }

    if (invite.status === 'expired') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-ink)]/10 bg-[color:var(--color-ink)]/5 px-2.5 py-1 text-xs font-semibold text-[color:var(--color-ink)]/50">
                Kedaluwarsa
            </span>
        );
    }

    if (invite.send_status === 'failed') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-coral)]/25 bg-[color:var(--color-coral)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--color-coral)]">
                <AlertCircle className="h-3 w-3" /> Gagal terkirim
            </span>
        );
    }

    if (invite.send_status === 'sent') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-mint)]/25 bg-[color:var(--color-mint)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--color-mint-deep)]">
                <Send className="h-3 w-3" /> Terkirim
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--color-sky-deep)]">
            <Clock className="h-3 w-3" /> Terjadwal
        </span>
    );
}

export default function InvitesIndex({ invite, areaName, frame, tenantInvites, units, showPengurusTab }: Props) {
    const [tab, setTab] = useState<Tab>(frame === 'pengelola' && showPengurusTab ? 'pengurus' : 'warga');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [revokeTarget, setRevokeTarget] = useState<TenantInvite | null>(null);

    const link = invite ? `${window.location.origin}/invite/${invite.code}` : null;
    const isPengelolaFrame = frame === 'pengelola';

    function generate() {
        setProcessing(true);
        router.post('/admin/invites', {}, {
            onFinish: () => {
                setProcessing(false);
                setConfirmOpen(false);
            },
        });
    }

    function copyLink() {
        if (!link) {
            return;
        }

        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function shareWhatsApp() {
        if (!link) {
            return;
        }

        const text = encodeURIComponent(`Halo! Saya ingin mengajak Anda menjadi pengurus di ${areaName}. Daftar lewat tautan ini ya: ${link}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    }

    function revoke() {
        if (!revokeTarget) {
            return;
        }

        setProcessing(true);
        router.post(`/admin/invites/${revokeTarget.id}/revoke`, {}, {
            onFinish: () => {
                setProcessing(false);
                setRevokeTarget(null);
            },
        });
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-[color:var(--color-bg)] p-4 sm:p-6 lg:p-8">
            <Head title="Undangan" />

            <div className="flex flex-col gap-1">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-sky-deep)]">
                    Admin · Undangan
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-3xl">
                    Undangan {areaName}
                </h1>
            </div>

            {showPengurusTab && (
                <div className="flex items-center gap-1 rounded-lg bg-[color:var(--color-ink)]/5 p-1 sm:w-fit">
                    <button
                        type="button"
                        onClick={() => setTab('warga')}
                        className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition sm:flex-none ${
                            tab === 'warga' ? 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-sm' : 'text-[color:var(--color-ink)]/55'
                        }`}
                    >
                        Undang Warga
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('pengurus')}
                        className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition sm:flex-none ${
                            tab === 'pengurus' ? 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-sm' : 'text-[color:var(--color-ink)]/55'
                        }`}
                    >
                        Tautan Pengurus
                    </button>
                </div>
            )}

            {(!showPengurusTab || tab === 'warga') ? (
                <TenantInvitesPanel units={units} invites={tenantInvites} onRevoke={setRevokeTarget} />
            ) : (
                <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
                    <section className="relative overflow-hidden rounded-[2rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-6 shadow-elevated lg:p-8">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_color-mix(in_srgb,_var(--color-mint)_14%,_transparent),_transparent_45%),radial-gradient(circle_at_bottom_right,_color-mix(in_srgb,_var(--color-sky)_14%,_transparent),_transparent_40%)]" />

                        <div className="relative">
                            {invite ? (
                                <>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-mint)]/12 text-[color:var(--color-mint-deep)]">
                                                <ShieldCheck className="h-5 w-5" />
                                            </span>
                                            <div>
                                                <p className="font-display text-lg font-semibold text-[color:var(--color-ink)]">
                                                    Tautan undangan aktif
                                                </p>
                                                <p className="text-sm text-[color:var(--color-ink)]/55">Untuk mengajak calon pengurus</p>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-mint)]/25 bg-[color:var(--color-mint)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--color-mint-deep)]">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-mint-deep)]" />
                                            Aktif
                                        </span>
                                    </div>

                                    <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="min-w-0 flex-1 truncate font-mono text-sm text-[color:var(--color-ink)]/80">{link}</p>
                                        <Button variant={copied ? 'secondary' : 'outline'} size="sm" className="shrink-0" onClick={copyLink}>
                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                            {copied ? 'Tersalin' : 'Salin tautan'}
                                        </Button>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2.5">
                                        <Button
                                            onClick={shareWhatsApp}
                                            className="bg-[color:var(--color-mint-deep)] text-white hover:bg-[color:var(--color-mint-deep)]/90"
                                        >
                                            <MessageCircle className="h-4 w-4" /> Bagikan ke WhatsApp
                                        </Button>
                                        <Button variant="outline" onClick={() => setConfirmOpen(true)}>
                                            <RefreshCw className="h-4 w-4" /> Buat ulang
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center py-6 text-center">
                                    <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-mint)]/12 text-[color:var(--color-mint-deep)]">
                                        <ShieldCheck className="h-7 w-7" />
                                    </span>
                                    <p className="mt-4 font-display text-lg font-semibold text-[color:var(--color-ink)]">
                                        Belum ada undangan aktif
                                    </p>
                                    <p className="mt-1 max-w-sm text-sm leading-relaxed text-[color:var(--color-ink)]/55">
                                        Buat tautan untuk mengajak calon pengurus bergabung sebagai admin di area Anda.
                                    </p>
                                    <Button className="mt-5" disabled={processing} onClick={generate}>
                                        {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Buat tautan undangan
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="flex flex-col gap-4">
                        <div className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-5 shadow-elevated">
                            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-ink)]/50">
                                Cara kerjanya
                            </p>
                            <ul className="mt-3 space-y-3">
                                {[
                                    { icon: Link2, text: 'Bagikan satu tautan ke calon pengurus.' },
                                    { icon: Users, text: 'Mereka isi data dan langsung terdaftar sebagai warga.' },
                                    { icon: RefreshCw, text: 'Buat ulang kapan saja — tautan lama otomatis tidak berlaku.' },
                                ].map((item) => (
                                    <li key={item.text} className="flex items-start gap-2.5 text-sm text-[color:var(--color-ink)]/70">
                                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-ink)]/5 text-[color:var(--color-ink)]/60">
                                            <item.icon className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="leading-relaxed">{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-[1.5rem] border border-[color:var(--color-mint)]/20 bg-[color:var(--color-mint)]/8 p-5">
                            <p className="text-sm leading-relaxed text-[color:var(--color-ink)]">
                                Setelah calon pengurus bergabung, Anda bisa menyerahkan akses pengelola ke akun mereka dari halaman Anggota
                                kapan saja.
                            </p>
                        </div>
                    </aside>
                </div>
            )}

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Buat ulang tautan undangan?</DialogTitle>
                        <DialogDescription>
                            Tautan undangan lama akan langsung tidak berlaku. Siapa pun yang masih memegangnya akan melihat pesan
                            "tautan tidak valid".
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                            Batal
                        </Button>
                        <Button disabled={processing} onClick={generate}>
                            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                            Ya, buat ulang
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Batalkan undangan ini?</DialogTitle>
                        <DialogDescription>
                            Undangan untuk <span className="font-medium text-[color:var(--color-ink)]">{revokeTarget?.phone}</span> (unit{' '}
                            {revokeTarget?.unit}) tidak akan bisa dipakai lagi untuk mendaftar.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRevokeTarget(null)}>
                            Batal
                        </Button>
                        <Button disabled={processing} onClick={revoke}>
                            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                            Ya, batalkan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function TenantInvitesPanel({
    units,
    invites,
    onRevoke,
}: {
    units: Unit[];
    invites: TenantInvite[];
    onRevoke: (invite: TenantInvite) => void;
}) {
    const [phone, setPhone] = useState('');
    const [unitId, setUnitId] = useState('');
    const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
    const [scheduledAt, setScheduledAt] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [resendingId, setResendingId] = useState<number | null>(null);
    const pageSize = 10;

    function resend(invite: TenantInvite) {
        setResendingId(invite.id);
        router.post(
            `/admin/invites/${invite.id}/resend`,
            {},
            { onFinish: () => setResendingId(null) },
        );
    }

    const filteredInvites = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) {
            return invites;
        }

        return invites.filter((inv) => `${inv.phone} ${inv.unit}`.toLowerCase().includes(q));
    }, [invites, search]);

    const pageCount = Math.max(1, Math.ceil(filteredInvites.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const paginatedInvites = filteredInvites.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    function handleSearchChange(next: string) {
        setSearch(next);
        setPage(1);
    }

    function submit() {
        const next: Record<string, string> = {};

        if (!phone.trim()) {
            next.phone = 'No. HP wajib diisi.';
        }

        if (!unitId) {
            next.unit_id = 'Pilih unit terlebih dahulu.';
        }

        if (scheduleMode === 'later' && !scheduledAt) {
            next.scheduled_at = 'Pilih tanggal & waktu pengiriman.';
        }

        if (Object.keys(next).length > 0) {
            setErrors(next);

            return;
        }

        setErrors({});
        setSubmitting(true);

        router.post(
            '/admin/invites/tenant',
            {
                phone,
                unit_id: unitId,
                scheduled_at: scheduleMode === 'later' ? scheduledAt : undefined,
            },
            {
                onFinish: () => setSubmitting(false),
                onSuccess: () => {
                    setPhone('');
                    setUnitId('');
                    setScheduleMode('now');
                    setScheduledAt('');
                },
                onError: setErrors,
            },
        );
    }

    return (
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="flex flex-col gap-4 rounded-[2rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-6 shadow-elevated">
                <div>
                    <p className="font-display text-lg font-semibold text-[color:var(--color-ink)]">Undang warga baru</p>
                    <p className="mt-1 text-sm text-[color:var(--color-ink)]/55">
                        Masukkan no. HP dan pilih unitnya — undangan akan langsung aktif begitu mereka mendaftar, tanpa perlu persetujuan.
                    </p>
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium text-[color:var(--color-ink)]" htmlFor="tenant-phone">
                        No. HP warga
                    </label>
                    <input
                        id="tenant-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                        className="rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-bg)] px-3.5 py-2 text-sm text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink)]/40 focus:border-[color:var(--color-sky)]/50 focus:ring-2 focus:ring-[color:var(--color-sky)]/20"
                    />
                    {errors.phone && <p className="text-sm text-[color:var(--color-coral)]">{errors.phone}</p>}
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium text-[color:var(--color-ink)]">Unit</label>
                    <Combobox
                        value={unitId}
                        onValueChange={setUnitId}
                        options={units.map((u) => ({ value: String(u.id), label: u.label }))}
                        placeholder={units.length === 0 ? 'Belum ada unit terdaftar' : 'Pilih unit'}
                        searchPlaceholder="Cari unit..."
                        emptyText="Unit tidak ditemukan."
                        disabled={units.length === 0}
                    />
                    {errors.unit_id && <p className="text-sm text-[color:var(--color-coral)]">{errors.unit_id}</p>}
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium text-[color:var(--color-ink)]">Pengiriman</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setScheduleMode('now')}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                scheduleMode === 'now'
                                    ? 'border-[color:var(--color-sky-deep)] bg-[color:var(--color-sky)]/8 text-[color:var(--color-sky-deep)]'
                                    : 'border-[color:var(--color-ink)]/10 text-[color:var(--color-ink)]/70 hover:bg-[color:var(--color-bg)]'
                            }`}
                        >
                            <Send className="mr-1.5 inline h-3.5 w-3.5" /> Kirim sekarang
                        </button>
                        <button
                            type="button"
                            onClick={() => setScheduleMode('later')}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                scheduleMode === 'later'
                                    ? 'border-[color:var(--color-sky-deep)] bg-[color:var(--color-sky)]/8 text-[color:var(--color-sky-deep)]'
                                    : 'border-[color:var(--color-ink)]/10 text-[color:var(--color-ink)]/70 hover:bg-[color:var(--color-bg)]'
                            }`}
                        >
                            <Calendar className="mr-1.5 inline h-3.5 w-3.5" /> Jadwalkan
                        </button>
                    </div>

                    {scheduleMode === 'later' && (
                        <div className="duration-150 animate-in fade-in">
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                className="w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-bg)] px-3.5 py-2 text-sm text-[color:var(--color-ink)] outline-none focus:border-[color:var(--color-sky)]/50 focus:ring-2 focus:ring-[color:var(--color-sky)]/20"
                            />
                            {errors.scheduled_at && <p className="mt-1.5 text-sm text-[color:var(--color-coral)]">{errors.scheduled_at}</p>}
                        </div>
                    )}
                </div>

                <Button className="w-full" disabled={submitting} onClick={submit}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {scheduleMode === 'now' ? 'Simpan & Kirim' : 'Jadwalkan Undangan'}
                </Button>

                <p className="text-xs text-[color:var(--color-ink)]/40">Undangan dikirim lewat WhatsApp.</p>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] shadow-elevated">
                <div className="flex flex-col gap-3 border-b border-[color:var(--color-ink)]/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-display text-base font-semibold text-[color:var(--color-ink)]">Riwayat undangan</p>
                        <p className="text-xs text-[color:var(--color-ink)]/45">{filteredInvites.length} undangan tercatat</p>
                    </div>
                    <div className="relative sm:w-64">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--color-ink)]/40" />
                        <input
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Cari no. HP atau unit..."
                            className="w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-bg)] py-2 pr-3 pl-9 text-sm text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink)]/40 focus:border-[color:var(--color-sky)]/50 focus:ring-2 focus:ring-[color:var(--color-sky)]/20"
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="border-[color:var(--color-ink)]/8 hover:bg-transparent">
                            <TableHead className="h-8 pl-5 text-[11px] font-medium text-[color:var(--color-ink)]/40">No. HP</TableHead>
                            <TableHead className="h-8 text-[11px] font-medium text-[color:var(--color-ink)]/40">Unit</TableHead>
                            <TableHead className="h-8 text-[11px] font-medium text-[color:var(--color-ink)]/40">Status</TableHead>
                            <TableHead className="h-8 text-[11px] font-medium text-[color:var(--color-ink)]/40">Jadwal / Terkirim</TableHead>
                            <TableHead className="h-8 pr-5" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedInvites.map((inv) => (
                            <TableRow key={inv.id} className="border-[color:var(--color-ink)]/6 last:border-0">
                                <TableCell className="py-2.5 pl-5 text-sm font-medium text-[color:var(--color-ink)]">{inv.phone}</TableCell>
                                <TableCell className="py-2.5 text-sm text-[color:var(--color-ink)]/60">{inv.unit}</TableCell>
                                <TableCell className="py-2.5">
                                    <StatusBadge invite={inv} />
                                    {inv.send_status === 'failed' && inv.send_error && (
                                        <p className="mt-1 max-w-[16rem] truncate text-xs text-[color:var(--color-coral)]" title={inv.send_error}>
                                            {inv.send_error}
                                        </p>
                                    )}
                                </TableCell>
                                <TableCell className="py-2.5 text-xs text-[color:var(--color-ink)]/50">
                                    {inv.sent_at ? formatDateTime(inv.sent_at) : formatDateTime(inv.scheduled_at)}
                                </TableCell>
                                <TableCell className="py-2.5 pr-5 text-right">
                                    <div className="flex justify-end gap-1">
                                        {inv.status === 'active' && inv.send_status !== 'pending' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-[color:var(--color-sky-deep)]"
                                                disabled={resendingId === inv.id}
                                                onClick={() => resend(inv)}
                                            >
                                                {resendingId === inv.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                )}
                                                Kirim ulang
                                            </Button>
                                        )}
                                        {inv.status === 'active' && (
                                            <Button variant="ghost" size="sm" className="h-7 text-xs text-[color:var(--color-coral)]" onClick={() => onRevoke(inv)}>
                                                Batalkan
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {filteredInvites.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-ink)]/5 text-[color:var(--color-ink)]/40">
                            <Users className="h-4.5 w-4.5" />
                        </span>
                        <p className="text-sm text-[color:var(--color-ink)]/50">
                            {invites.length === 0 ? 'Belum ada undangan yang dikirim.' : 'Tidak ada undangan yang cocok dengan pencarian.'}
                        </p>
                    </div>
                )}

                {filteredInvites.length > 0 && pageCount > 1 && (
                    <div className="flex items-center justify-between border-t border-[color:var(--color-ink)]/8 px-5 py-3">
                        <p className="text-xs text-[color:var(--color-ink)]/45">
                            Halaman {currentPage} dari {pageCount}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={currentPage <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={currentPage >= pageCount}
                                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
