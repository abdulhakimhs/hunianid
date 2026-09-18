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
    ShieldCheck,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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

import type { Area, SecurityInviteGuard, SecurityInviteLog } from '@/types';

type Props = {
    guards: SecurityInviteGuard[];
    area: Area;
    securityMessageTemplate: string;
};

type StatusFilter = 'all' | 'not_invited' | 'pending' | 'claimed';

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

function guardStatus(guard: SecurityInviteGuard): Exclude<StatusFilter, 'all'> {
    if (guard.claimed) {
        return 'claimed';
    }

    return guard.invites.length === 0 ? 'not_invited' : 'pending';
}

function StatusBadge({ guard }: { guard: SecurityInviteGuard }) {
    const status = guardStatus(guard);

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

export default function SecurityInvitesIndex({ guards, area, securityMessageTemplate }: Props) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [sendingId, setSendingId] = useState<number | null>(null);
    const [bulkSending, setBulkSending] = useState(false);
    const [historyGuard, setHistoryGuard] = useState<SecurityInviteGuard | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const stats = useMemo(() => {
        const notInvited = guards.filter((g) => guardStatus(g) === 'not_invited').length;
        const pending = guards.filter((g) => guardStatus(g) === 'pending').length;
        const claimed = guards.filter((g) => guardStatus(g) === 'claimed').length;

        return { total: guards.length, notInvited, pending, claimed };
    }, [guards]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        let rows = guards;

        if (statusFilter !== 'all') {
            rows = rows.filter((g) => guardStatus(g) === statusFilter);
        }

        if (q) {
            rows = rows.filter(
                (g) =>
                    g.name.toLowerCase().includes(q) || g.phone.toLowerCase().includes(q),
            );
        }

        return rows;
    }, [guards, query, statusFilter]);

    const FILTERS: { key: StatusFilter; label: string; count: number }[] = [
        { key: 'all', label: 'Semua', count: stats.total },
        { key: 'not_invited', label: 'Belum Diundang', count: stats.notInvited },
        { key: 'pending', label: 'Menunggu Diklaim', count: stats.pending },
        { key: 'claimed', label: 'Sudah Aktif', count: stats.claimed },
    ];

    // Only guards without a password yet can be invited — claimed ones have nothing
    // to select for.
    const selectableRows = useMemo(
        () => filtered.filter((g) => !g.claimed),
        [filtered],
    );
    const allSelectableSelected =
        selectableRows.length > 0 && selectableRows.every((g) => selected.has(g.id));

    function toggleAll() {
        setSelected(allSelectableSelected ? new Set() : new Set(selectableRows.map((g) => g.id)));
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

    function sendInvite(guard: SecurityInviteGuard) {
        setSendingId(guard.id);

        router.post(
            `/admin/security/${guard.id}/invite`,
            {},
            { onFinish: () => setSendingId(null) },
        );
    }

    function sendBulk() {
        setBulkSending(true);

        router.post(
            '/admin/security/invite-bulk',
            { ids: Array.from(selected) },
            {
                onSuccess: () => setSelected(new Set()),
                onFinish: () => setBulkSending(false),
            },
        );
    }

    function copyLink(guard: SecurityInviteGuard) {
        if (!guard.claim_link) {
            return;
        }

        navigator.clipboard.writeText(guard.claim_link);
        setCopiedId(guard.id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    function shareWhatsApp(guard: SecurityInviteGuard) {
        if (!guard.claim_link) {
            return;
        }

        const message = securityMessageTemplate
            .replaceAll('{nama}', guard.name)
            .replaceAll('{komplek}', area.complex?.name ?? '')
            .replaceAll('{link}', guard.claim_link);

        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Undangan Security" />

            <div>
                <Link
                    href="/admin/security"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-(--color-ink)/50 hover:text-(--color-ink)/75"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Data Security
                </Link>
            </div>

            <div className="flex flex-col gap-1">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Undangan Security
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Undangan Security {area.complex?.name}-{area.name}
                </h1>
            </div>

            <section className="shadow-elevated overflow-hidden rounded-2xl border border-(--color-ink)/8 bg-(--color-surface)">
                <div className="flex flex-col gap-3 border-b border-(--color-ink)/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-(--color-bg) p-1">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setStatusFilter(f.key)}
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
                            onChange={(e) => setQuery(e.target.value)}
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
                        {filtered.map((g) => {
                            const lastLog = g.invites[0] ?? null;

                            return (
                                <TableRow
                                    key={g.id}
                                    className="hover:bg-(--color-ink)/0.02 border-(--color-ink)/6 transition-colors last:border-0"
                                >
                                    <TableCell className="py-2 pl-4">
                                        <Checkbox
                                            checked={selected.has(g.id)}
                                            onCheckedChange={() => toggleOne(g.id)}
                                            disabled={g.claimed}
                                            aria-label={`Pilih ${g.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-sm font-medium text-(--color-ink)">
                                            {g.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-(--color-ink)/55 text-sm">
                                            {g.phone}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <StatusBadge guard={g} />
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
                                            {g.invites.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    title="Riwayat undangan"
                                                    onClick={() => setHistoryGuard(g)}
                                                >
                                                    <History className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {!g.claimed && g.claim_link && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        title="Salin tautan"
                                                        onClick={() => copyLink(g)}
                                                    >
                                                        {copiedId === g.id ? (
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
                                                        onClick={() => shareWhatsApp(g)}
                                                    >
                                                        <MessageCircle className="h-3.5 w-3.5" />
                                                    </Button>
                                                </>
                                            )}
                                            {!g.claimed && (
                                                <Button
                                                    size="sm"
                                                    className="h-7"
                                                    disabled={sendingId === g.id}
                                                    onClick={() => sendInvite(g)}
                                                >
                                                    {sendingId === g.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Send className="h-3.5 w-3.5" />
                                                    )}
                                                    {g.invites.length > 0 ? 'Undang Ulang' : 'Undang'}
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
                            <ShieldCheck className="h-4.5 w-4.5" />
                        </span>
                        <p className="text-sm text-(--color-ink)/50">
                            {guards.length === 0
                                ? 'Belum ada data Security. Tambahkan dulu dari halaman Data Security.'
                                : 'Tidak ada Security yang cocok dengan filter/pencarian.'}
                        </p>
                    </div>
                )}
            </section>

            <Dialog
                open={!!historyGuard}
                onOpenChange={(open) => !open && setHistoryGuard(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Riwayat Undangan</DialogTitle>
                        <DialogDescription>
                            Semua percobaan undangan untuk {historyGuard?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <ul className="flex flex-col gap-1.5">
                        {historyGuard?.invites.map((log) => (
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
                        <Button variant="outline" onClick={() => setHistoryGuard(null)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
