import { Head, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CalendarDays,
    Eye,
    Home,
    Loader2,
    Mail,
    Phone,
    Search,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Member = {
    id: number;
    user_id: number;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    roleLabel: string;
    joinedAt: string | null;
    unit: string | null;
};

type Props = {
    members: Member[];
    areaName: string;
    canPromote: boolean;
};

const ROLE_STYLES: Record<string, { dot: string; text: string; avatar: string }> = {
    superadmin: {
        dot: 'bg-[color:var(--color-mint)]',
        text: 'text-[color:var(--color-mint-deep)]',
        avatar: 'bg-[color:var(--color-mint)]/12 text-[color:var(--color-mint-deep)]',
    },
    staff: {
        dot: 'bg-[color:var(--color-mint)]',
        text: 'text-[color:var(--color-mint-deep)]',
        avatar: 'bg-[color:var(--color-mint)]/12 text-[color:var(--color-mint-deep)]',
    },
    security: {
        dot: 'bg-[color:var(--color-sky)]',
        text: 'text-[color:var(--color-sky-deep)]',
        avatar: 'bg-[color:var(--color-sky)]/12 text-[color:var(--color-sky-deep)]',
    },
    resident: {
        dot: 'bg-[color:var(--color-ink)]/30',
        text: 'text-[color:var(--color-ink)]/60',
        avatar: 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink)]/60',
    },
};

const ADMIN_ROLES = new Set(['superadmin', 'staff']);

type SortKey = 'name' | 'joinedAt';
type SortDir = 'asc' | 'desc';
type RoleFilter = 'all' | 'admin' | 'resident';

function roleStyle(role: string) {
    return ROLE_STYLES[role] ?? ROLE_STYLES.resident;
}

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function formatDate(iso: string | null, style: 'long' | 'short' = 'long'): string {
    if (!iso) {
        return '—';
    }

    return new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: style,
        year: 'numeric',
    });
}

export default function MembersIndex({ members, areaName, canPromote }: Props) {
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [detail, setDetail] = useState<Member | null>(null);
    const [target, setTarget] = useState<Member | null>(null);
    const [type, setType] = useState<'rt_rw' | 'developer' | ''>('');
    const [processing, setProcessing] = useState(false);

    const stats = useMemo(() => {
        const admins = members.filter((m) => ADMIN_ROLES.has(m.role)).length;

        return { total: members.length, admins, residents: members.length - admins };
    }, [members]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        let rows = members;

        if (roleFilter === 'admin') {
            rows = rows.filter((m) => ADMIN_ROLES.has(m.role));
        } else if (roleFilter === 'resident') {
            rows = rows.filter((m) => !ADMIN_ROLES.has(m.role));
        }

        if (q) {
            rows = rows.filter(
                (m) =>
                    m.name.toLowerCase().includes(q) ||
                    m.email.toLowerCase().includes(q) ||
                    (m.phone ?? '').toLowerCase().includes(q) ||
                    (m.unit ?? '').toLowerCase().includes(q),
            );
        }

        const sorted = [...rows].sort((a, b) => {
            if (sortKey === 'name') {
                return a.name.localeCompare(b.name);
            }

            return (a.joinedAt ?? '').localeCompare(b.joinedAt ?? '');
        });

        return sortDir === 'asc' ? sorted : sorted.reverse();
    }, [members, query, roleFilter, sortKey, sortDir]);

    function toggleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
            return;
        }

        setSortKey(key);
        setSortDir('asc');
    }

    function sortIcon(key: SortKey) {
        if (sortKey !== key) {
            return <ArrowUpDown className="h-3 w-3 text-[color:var(--color-ink)]/25" />;
        }

        return sortDir === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-[color:var(--color-sky-deep)]" />
        ) : (
            <ArrowDown className="h-3 w-3 text-[color:var(--color-sky-deep)]" />
        );
    }

    function promote() {
        if (!target || !type) {
            return;
        }

        setProcessing(true);
        router.post(
            '/admin/area/promote',
            { area_member_id: target.id, type },
            {
                onFinish: () => {
                    setProcessing(false);
                    setTarget(null);
                    setType('');
                },
            },
        );
    }

    const FILTERS: { key: RoleFilter; label: string; count: number }[] = [
        { key: 'all', label: 'Semua', count: stats.total },
        { key: 'admin', label: 'Pengurus', count: stats.admins },
        { key: 'resident', label: 'Warga', count: stats.residents },
    ];

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-[color:var(--color-bg)] p-4 sm:p-6 lg:p-8">
            <Head title="Anggota" />

            <div className="flex flex-col gap-1">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-sky-deep)]">
                    Admin · Anggota
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-3xl">
                    Anggota {areaName}
                </h1>
            </div>

            <section className="overflow-hidden rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] shadow-elevated">
                <div className="flex flex-col gap-3 border-b border-[color:var(--color-ink)]/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1 rounded-lg bg-[color:var(--color-bg)] p-1">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setRoleFilter(f.key)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                    roleFilter === f.key
                                        ? 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-sm'
                                        : 'text-[color:var(--color-ink)]/50 hover:text-[color:var(--color-ink)]/80'
                                }`}
                            >
                                {f.label} <span className="tabular-nums opacity-60">{f.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--color-ink)]/35" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari anggota..."
                            className="w-full rounded-lg border border-[color:var(--color-ink)]/10 bg-[color:var(--color-bg)] py-1.5 pr-3 pl-8 text-sm text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink)]/40 focus:border-[color:var(--color-sky)]/50 focus:ring-2 focus:ring-[color:var(--color-sky)]/15"
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="border-[color:var(--color-ink)]/8 hover:bg-transparent">
                            <TableHead className="h-8 pl-4">
                                <button
                                    type="button"
                                    onClick={() => toggleSort('name')}
                                    className="flex items-center gap-1 text-[11px] font-medium text-[color:var(--color-ink)]/40"
                                >
                                    Anggota {sortIcon('name')}
                                </button>
                            </TableHead>
                            <TableHead className="h-8 text-[11px] font-medium text-[color:var(--color-ink)]/40">Unit</TableHead>
                            <TableHead className="h-8 text-[11px] font-medium text-[color:var(--color-ink)]/40">Peran</TableHead>
                            <TableHead className="h-8">
                                <button
                                    type="button"
                                    onClick={() => toggleSort('joinedAt')}
                                    className="flex items-center gap-1 text-[11px] font-medium text-[color:var(--color-ink)]/40"
                                >
                                    Bergabung {sortIcon('joinedAt')}
                                </button>
                            </TableHead>
                            <TableHead className="h-8 pr-4" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((m) => {
                            const style = roleStyle(m.role);

                            return (
                                <TableRow
                                    key={m.id}
                                    className="border-[color:var(--color-ink)]/6 transition-colors last:border-0 hover:bg-[color:var(--color-ink)]/[0.02]"
                                >
                                    <TableCell className="py-2 pl-4">
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${style.avatar}`}
                                            >
                                                {initials(m.name)}
                                            </span>
                                            <div className="min-w-0 leading-tight">
                                                <p className="truncate text-sm font-medium text-[color:var(--color-ink)]">{m.name}</p>
                                                <p className="truncate text-[11px] text-[color:var(--color-ink)]/45">{m.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-sm text-[color:var(--color-ink)]/55">{m.unit ?? '—'}</span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.text}`}>
                                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                                            {m.roleLabel}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-xs text-[color:var(--color-ink)]/45">{formatDate(m.joinedAt, 'short')}</span>
                                    </TableCell>
                                    <TableCell className="py-2 pr-4">
                                        <div className="flex justify-end gap-1.5">
                                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => setDetail(m)}>
                                                <Eye className="h-3.5 w-3.5" /> Detail
                                            </Button>
                                            {canPromote && m.role !== 'superadmin' && (
                                                <Button
                                                    size="sm"
                                                    className="h-7 bg-[color:var(--color-mint)] px-2.5 text-xs text-white hover:bg-[color:var(--color-mint-deep)]"
                                                    onClick={() => setTarget(m)}
                                                >
                                                    <ShieldCheck className="h-3.5 w-3.5" /> Jadikan Pengurus
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
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-ink)]/5 text-[color:var(--color-ink)]/40">
                            <Users className="h-4.5 w-4.5" />
                        </span>
                        <p className="text-sm text-[color:var(--color-ink)]/50">
                            {members.length === 0 ? 'Belum ada anggota terdaftar.' : 'Tidak ada anggota yang cocok dengan pencarian.'}
                        </p>
                    </div>
                )}
            </section>

            {/* Detail modal */}
            <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
                <DialogContent>
                    <DialogHeader>
                        <div
                            className={`mb-1 flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-semibold ${detail ? roleStyle(detail.role).avatar : ''}`}
                        >
                            {detail ? initials(detail.name) : ''}
                        </div>
                        <DialogTitle>{detail?.name}</DialogTitle>
                        <DialogDescription>
                            <span
                                className={`mt-1 inline-flex items-center gap-1.5 text-xs font-medium ${detail ? roleStyle(detail.role).text : ''}`}
                            >
                                <span className={`h-1.5 w-1.5 rounded-full ${detail ? roleStyle(detail.role).dot : ''}`} />
                                {detail?.roleLabel}
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 text-sm">
                        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)] px-3.5 py-3">
                            <Mail className="h-4 w-4 shrink-0 text-[color:var(--color-ink)]/45" />
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-[color:var(--color-ink)]/45">Email</p>
                                <p className="truncate font-medium text-[color:var(--color-ink)]">{detail?.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)] px-3.5 py-3">
                            <Phone className="h-4 w-4 shrink-0 text-[color:var(--color-ink)]/45" />
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-[color:var(--color-ink)]/45">Telepon</p>
                                <p className="truncate font-medium text-[color:var(--color-ink)]">{detail?.phone ?? '—'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)] px-3.5 py-3">
                            <Home className="h-4 w-4 shrink-0 text-[color:var(--color-ink)]/45" />
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-[color:var(--color-ink)]/45">Unit</p>
                                <p className="truncate font-medium text-[color:var(--color-ink)]">{detail?.unit ?? 'Belum tertaut unit'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)] px-3.5 py-3">
                            <CalendarDays className="h-4 w-4 shrink-0 text-[color:var(--color-ink)]/45" />
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-[color:var(--color-ink)]/45">Bergabung sejak</p>
                                <p className="truncate font-medium text-[color:var(--color-ink)]">{formatDate(detail?.joinedAt ?? null)}</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetail(null)}>
                            Tutup
                        </Button>
                        {canPromote && detail && detail.role !== 'superadmin' && (
                            <Button
                                className="bg-[color:var(--color-mint)] text-white hover:bg-[color:var(--color-mint-deep)]"
                                onClick={() => {
                                    setTarget(detail);
                                    setDetail(null);
                                }}
                            >
                                <ShieldCheck className="h-4 w-4" /> Jadikan Pengurus
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Promote modal */}
            <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-mint)]/12 text-[color:var(--color-mint-deep)]">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <DialogTitle>Serahkan akses pengelola?</DialogTitle>
                        <DialogDescription>
                            <span className="font-medium text-[color:var(--color-ink)]">{target?.name}</span> akan menjadi pengurus
                            resmi {areaName}. Mereka akan bisa mengelola warga, tagihan, dan pengaturan lainnya. Anda tetap
                            terdaftar sebagai warga seperti biasa.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Jenis pengelola" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rt_rw">RT/RW</SelectItem>
                                <SelectItem value="developer">Developer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTarget(null)}>
                            Batal
                        </Button>
                        <Button
                            className="bg-[color:var(--color-mint)] text-white hover:bg-[color:var(--color-mint-deep)]"
                            disabled={!type || processing}
                            onClick={promote}
                        >
                            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                            Ya, jadikan pengurus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
