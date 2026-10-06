import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    History,
    Loader2,
    MessageCircle,
    Search,
    Send,
    UserCog,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import type { Area, StaffInviteMember, SecurityInviteLog } from '@/types';

type Props = {
    staff: StaffInviteMember[];
    area: Area;
};

type StatusFilter = 'all' | 'not_invited' | 'pending' | 'claimed';

// Fixed message, matching StaffInviteService::INVITE_MESSAGE server-side — this copy
// is only for the "share manually via WhatsApp" convenience button; the real "Undang"
// send always goes through the backend's own copy of this text.
const STAFF_INVITE_MESSAGE = 'Halo {nama}! {komplek} telah membuat akun Staff untuk Anda. '
    + 'Silakan buat kata sandi Anda lewat tautan berikut untuk mulai menggunakan aplikasi: {link}'
    + '\n\nTautan ini bersifat pribadi, jangan bagikan ke orang lain.';

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function memberStatus(member: StaffInviteMember): Exclude<StatusFilter, 'all'> {
    if (member.claimed) {
        return 'claimed';
    }

    return member.invites.length === 0 ? 'not_invited' : 'pending';
}

function StatusBadge({ member }: { member: StaffInviteMember }) {
    const status = memberStatus(member);

    if (status === 'claimed') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-(--color-mint)/12 px-2 py-0.5 text-xs font-medium text-(--color-mint-deep)">
                <CheckCircle2 className="h-3 w-3" /> Sudah Aktif
            </span>
        );
    }

    if (status === 'pending') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-(--color-sky)/12 px-2 py-0.5 text-xs font-medium text-(--color-sky-deep)">
                <Clock className="h-3 w-3" /> Menunggu Diklaim
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-(--color-ink)/6 px-2 py-0.5 text-xs font-medium text-(--color-ink)/50">
            Belum Diundang
        </span>
    );
}

function LogBadge({ log }: { log: SecurityInviteLog }) {
    if (log.status === 'accepted') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-(--color-mint)/12 px-2 py-0.5 text-xs font-medium text-(--color-mint-deep)">
                <Check className="h-3 w-3" /> Diklaim
            </span>
        );
    }

    if (log.status === 'revoked') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-(--color-ink)/6 px-2 py-0.5 text-xs font-medium text-(--color-ink)/50">
                <X className="h-3 w-3" /> Dibatalkan
            </span>
        );
    }

    if (log.status === 'expired') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-(--color-ink)/6 px-2 py-0.5 text-xs font-medium text-(--color-ink)/50">
                Kedaluwarsa
            </span>
        );
    }

    if (log.send_status === 'failed') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-(--color-coral)/12 px-2 py-0.5 text-xs font-medium text-(--color-coral)">
                <AlertCircle className="h-3 w-3" /> Gagal terkirim
            </span>
        );
    }

    if (log.send_status === 'sent') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-(--color-sky)/12 px-2 py-0.5 text-xs font-medium text-(--color-sky-deep)">
                <Send className="h-3 w-3" /> Menunggu diklaim
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-(--color-ink)/6 px-2 py-0.5 text-xs font-medium text-(--color-ink)/50">
            <Clock className="h-3 w-3" /> Diproses
        </span>
    );
}

export default function StaffInvitesIndex({ staff, area }: Props) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [sendingId, setSendingId] = useState<number | null>(null);
    const [bulkSending, setBulkSending] = useState(false);
    const [historyMember, setHistoryMember] = useState<StaffInviteMember | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const stats = useMemo(() => {
        const notInvited = staff.filter((s) => memberStatus(s) === 'not_invited').length;
        const pending = staff.filter((s) => memberStatus(s) === 'pending').length;
        const claimed = staff.filter((s) => memberStatus(s) === 'claimed').length;

        return { total: staff.length, notInvited, pending, claimed };
    }, [staff]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        let rows = staff;

        if (statusFilter !== 'all') {
            rows = rows.filter((s) => memberStatus(s) === statusFilter);
        }

        if (q) {
            rows = rows.filter(
                (s) =>
                    s.name.toLowerCase().includes(q) || s.phone.toLowerCase().includes(q),
            );
        }

        return rows;
    }, [staff, query, statusFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    function handleQueryChange(next: string) {
        setQuery(next);
        setPage(1);
    }

    function handleStatusFilterChange(next: StatusFilter) {
        setStatusFilter(next);
        setPage(1);
    }

    const FILTERS: { key: StatusFilter; label: string; count: number }[] = [
        { key: 'all', label: 'Semua', count: stats.total },
        { key: 'not_invited', label: 'Belum Diundang', count: stats.notInvited },
        { key: 'pending', label: 'Menunggu Diklaim', count: stats.pending },
        { key: 'claimed', label: 'Sudah Aktif', count: stats.claimed },
    ];

    // Only members without a password yet can be invited — claimed ones have nothing
    // to select for.
    const selectableRows = useMemo(
        () => filtered.filter((s) => !s.claimed),
        [filtered],
    );
    const allSelectableSelected =
        selectableRows.length > 0 && selectableRows.every((s) => selected.has(s.id));

    function toggleAll() {
        setSelected(allSelectableSelected ? new Set() : new Set(selectableRows.map((s) => s.id)));
    }

    function toggleOne(id: number) {
        setSelected((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function sendInvite(member: StaffInviteMember) {
        setSendingId(member.id);

        router.post(
            `/admin/staff/${member.id}/invite`,
            {},
            { onFinish: () => setSendingId(null) },
        );
    }

    function sendBulk() {
        setBulkSending(true);

        router.post(
            '/admin/staff/invite-bulk',
            { ids: Array.from(selected) },
            {
                onSuccess: () => setSelected(new Set()),
                onFinish: () => setBulkSending(false),
            },
        );
    }

    function copyLink(member: StaffInviteMember) {
        if (!member.claim_link) {
            return;
        }

        navigator.clipboard.writeText(member.claim_link);
        setCopiedId(member.id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    function shareWhatsApp(member: StaffInviteMember) {
        if (!member.claim_link) {
            return;
        }

        const message = STAFF_INVITE_MESSAGE
            .replaceAll('{nama}', member.name)
            .replaceAll('{komplek}', area.complex?.name ?? '')
            .replaceAll('{link}', member.claim_link);

        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Undangan Staff" />

            <div>
                <Link
                    href="/admin/staff"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-(--color-ink)/50 hover:text-(--color-ink)/75"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Data Staff
                </Link>
            </div>

            <div className="flex flex-col gap-1">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Undangan Staff
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Undangan Staff {area.complex?.name}-{area.name}
                </h1>
            </div>

            <section className="shadow-elevated overflow-hidden rounded-2xl border border-(--color-ink)/8 bg-(--color-surface)">
                <div className="flex flex-col gap-3 border-b border-(--color-ink)/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-(--color-bg) p-1">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => handleStatusFilterChange(f.key)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                    statusFilter === f.key
                                        ? 'bg-(--color-surface) text-(--color-ink) shadow-sm'
                                        : 'text-(--color-ink)/50 hover:text-(--color-ink)/80'
                                }`}
                            >
                                {f.label}{' '}
                                <span className="tabular-nums opacity-60">
                                    {f.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--color-ink)/35" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => handleQueryChange(e.target.value)}
                            placeholder="Cari nama atau nomor WA..."
                            className="w-full rounded-lg border border-(--color-ink)/10 bg-(--color-bg) py-1.5 pr-3 pl-8 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                        />
                    </div>
                </div>

                {selected.size > 0 && (
                    <div className="flex items-center justify-between gap-3 border-b border-(--color-sky)/20 bg-(--color-sky)/8 px-4 py-2.5">
                        <p className="text-sm font-medium text-(--color-sky-deep)">
                            {selected.size} dipilih
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelected(new Set())}
                                disabled={bulkSending}
                            >
                                Batal
                            </Button>
                            <Button size="sm" onClick={sendBulk} disabled={bulkSending}>
                                {bulkSending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" />
                                )}
                                Undang yang Dipilih
                            </Button>
                        </div>
                    </div>
                )}

                <Table className="w-full table-fixed">
                    <TableHeader>
                        <TableRow className="border-(--color-ink)/8 hover:bg-transparent">
                            <TableHead className="h-8 w-10 pl-4">
                                <Checkbox
                                    checked={allSelectableSelected}
                                    onCheckedChange={toggleAll}
                                    disabled={selectableRows.length === 0}
                                    aria-label="Pilih semua"
                                />
                            </TableHead>
                            <TableHead className="h-8 text-[11px] font-medium text-(--color-ink)/40">
                                Nama
                            </TableHead>
                            <TableHead className="h-8 w-40 text-[11px] font-medium text-(--color-ink)/40">
                                No. WhatsApp
                            </TableHead>
                            <TableHead className="h-8 w-40 text-[11px] font-medium text-(--color-ink)/40">
                                Status
                            </TableHead>
                            <TableHead className="h-8 w-40 text-[11px] font-medium text-(--color-ink)/40">
                                Terakhir Dikirim
                            </TableHead>
                            <TableHead className="h-8 w-56 pr-4 text-right text-[11px] font-medium text-(--color-ink)/40">
                                Aksi
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map((s) => {
                            const lastLog = s.invites[0] ?? null;

                            return (
                                <TableRow
                                    key={s.id}
                                    className="hover:bg-(--color-ink)/0.02 border-(--color-ink)/6 transition-colors last:border-0"
                                >
                                    <TableCell className="py-2 pl-4">
                                        <Checkbox
                                            checked={selected.has(s.id)}
                                            onCheckedChange={() => toggleOne(s.id)}
                                            disabled={s.claimed}
                                            aria-label={`Pilih ${s.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-sm font-medium text-(--color-ink)">
                                            {s.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-(--color-ink)/55 text-sm">
                                            {s.phone}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <StatusBadge member={s} />
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-xs text-(--color-ink)/45">
                                            {lastLog
                                                ? formatDateTime(lastLog.sent_at ?? lastLog.created_at)
                                                : '—'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2 pr-4">
                                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                            {s.invites.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    title="Riwayat undangan"
                                                    onClick={() => setHistoryMember(s)}
                                                >
                                                    <History className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {!s.claimed && s.claim_link && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        title="Salin tautan"
                                                        onClick={() => copyLink(s)}
                                                    >
                                                        {copiedId === s.id ? (
                                                            <Check className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        title="Bagikan ke WhatsApp"
                                                        onClick={() => shareWhatsApp(s)}
                                                    >
                                                        <MessageCircle className="h-3.5 w-3.5" />
                                                    </Button>
                                                </>
                                            )}
                                            {!s.claimed && (
                                                <Button
                                                    size="sm"
                                                    className="h-7"
                                                    disabled={sendingId === s.id}
                                                    onClick={() => sendInvite(s)}
                                                >
                                                    {sendingId === s.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Send className="h-3.5 w-3.5" />
                                                    )}
                                                    {s.invites.length > 0 ? 'Undang Ulang' : 'Undang'}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                {filtered.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--color-ink)/5 text-(--color-ink)/40">
                            <UserCog className="h-4.5 w-4.5" />
                        </span>
                        <p className="text-sm text-(--color-ink)/50">
                            {staff.length === 0
                                ? 'Belum ada data Staff. Tambahkan dulu dari halaman Data Staff.'
                                : 'Tidak ada Staff yang cocok dengan filter/pencarian.'}
                        </p>
                    </div>
                )}

                <DataTablePagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
            </section>

            <Dialog
                open={!!historyMember}
                onOpenChange={(open) => !open && setHistoryMember(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Riwayat Undangan</DialogTitle>
                        <DialogDescription>
                            Semua percobaan undangan untuk {historyMember?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <ul className="flex flex-col gap-1.5">
                        {historyMember?.invites.map((log) => (
                            <li
                                key={log.id}
                                className="flex flex-col gap-1 rounded-lg bg-(--color-bg) px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <LogBadge log={log} />
                                    <span className="text-xs text-(--color-ink)/45">
                                        {formatDateTime(log.sent_at ?? log.created_at)}
                                    </span>
                                </div>
                                {log.send_error && (
                                    <p
                                        className="max-w-full truncate text-xs text-(--color-coral) sm:max-w-[16rem]"
                                        title={log.send_error}
                                    >
                                        {log.send_error}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHistoryMember(null)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
