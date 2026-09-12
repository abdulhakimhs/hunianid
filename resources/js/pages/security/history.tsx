import { Head } from '@inertiajs/react';
import { CheckCircle2, Clock, Search, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import SecurityBottomNav from '@/components/security/bottom-nav';

// Dummy data — swap for real props from GET /security/history once the
// backend endpoint exists. Grouping-by-day logic below works the same
// either way, as long as each entry has an ISO-ish `date` field.

type ScanStatus = 'valid' | 'invalid' | 'expired';

type ScanEntry = {
    id: number;
    visitor: string;
    unit: string;
    time: string;
    date: string; // 'Hari ini' | 'Kemarin' | '10 September 2026' — pre-grouped for the dummy set
    status: ScanStatus;
};

const dummyHistory: ScanEntry[] = [
    {
        id: 1,
        visitor: 'Andi Wijaya',
        unit: 'Blok C-12',
        time: '10:42',
        date: 'Hari ini',
        status: 'valid',
    },
    {
        id: 2,
        visitor: 'Siti Rahma',
        unit: 'Blok A-05',
        time: '10:15',
        date: 'Hari ini',
        status: 'valid',
    },
    {
        id: 3,
        visitor: 'Unknown QR',
        unit: '—',
        time: '09:58',
        date: 'Hari ini',
        status: 'invalid',
    },
    {
        id: 4,
        visitor: 'Dewi Lestari',
        unit: 'Blok B-08',
        time: '09:20',
        date: 'Hari ini',
        status: 'expired',
    },
    {
        id: 5,
        visitor: 'Rudi Hartono',
        unit: 'Blok C-01',
        time: '08:47',
        date: 'Hari ini',
        status: 'valid',
    },
    {
        id: 6,
        visitor: 'Fajar Nugroho',
        unit: 'Blok A-11',
        time: '19:30',
        date: 'Kemarin',
        status: 'valid',
    },
    {
        id: 7,
        visitor: 'Maya Sari',
        unit: 'Blok D-03',
        time: '16:12',
        date: 'Kemarin',
        status: 'valid',
    },
    {
        id: 8,
        visitor: 'Unknown QR',
        unit: '—',
        time: '14:05',
        date: 'Kemarin',
        status: 'invalid',
    },
    {
        id: 9,
        visitor: 'Bambang Setiawan',
        unit: 'Blok B-14',
        time: '11:40',
        date: 'Kemarin',
        status: 'expired',
    },
    {
        id: 10,
        visitor: 'Nina Kartika',
        unit: 'Blok C-07',
        time: '09:02',
        date: 'Kemarin',
        status: 'valid',
    },
    {
        id: 11,
        visitor: 'Yusuf Ibrahim',
        unit: 'Blok A-02',
        time: '17:55',
        date: '10 September 2026',
        status: 'valid',
    },
    {
        id: 12,
        visitor: 'Lina Wati',
        unit: 'Blok D-09',
        time: '13:20',
        date: '10 September 2026',
        status: 'valid',
    },
];

const filters: { key: 'all' | ScanStatus; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'valid', label: 'Valid' },
    { key: 'invalid', label: 'Tidak valid' },
    { key: 'expired', label: 'Kedaluwarsa' },
];

const statusMeta: Record<
    ScanStatus,
    { icon: typeof CheckCircle2; className: string }
> = {
    valid: {
        icon: CheckCircle2,
        className:
            'text-[color:var(--color-mint-deep)] bg-[color:var(--color-mint)]/12',
    },
    invalid: { icon: XCircle, className: 'text-red-600 bg-red-50' },
    expired: { icon: Clock, className: 'text-amber-600 bg-amber-50' },
};

export default function SecurityHistory() {
    const [filter, setFilter] = useState<'all' | ScanStatus>('all');
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        return dummyHistory.filter((entry) => {
            const matchesFilter = filter === 'all' || entry.status === filter;
            const matchesQuery = entry.visitor
                .toLowerCase()
                .includes(query.trim().toLowerCase());

            return matchesFilter && matchesQuery;
        });
    }, [filter, query]);

    const grouped = useMemo(() => {
        const groups: Record<string, ScanEntry[]> = {};

        for (const entry of filtered) {
            groups[entry.date] ??= [];
            groups[entry.date].push(entry);
        }

        return groups;
    }, [filtered]);

    const dateOrder = Object.keys(grouped); // dummy data is already in a sensible order

    return (
        <>
            <Head title="Riwayat" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-surface) pt-[env(safe-area-inset-top)]">
                {/* Header */}
                <div className="px-5 pt-5 pb-4">
                    <h1 className="text-lg font-semibold text-(--color-ink)">
                        Riwayat Scan
                    </h1>
                    <p className="mt-0.5 text-sm text-(--color-ink)/50">
                        {dummyHistory.length} total scan
                    </p>
                </div>

                {/* Search */}
                <div className="px-5 pb-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-(--color-ink)/35" />
                        <Input
                            placeholder="Cari nama tamu..."
                            className="h-11 pl-10 text-sm"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filter chips */}
                <div className="flex gap-2 overflow-x-auto px-5 pb-4">
                    {filters.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setFilter(key)}
                            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                                filter === key
                                    ? 'bg-(--color-ink) text-(--color-surface)'
                                    : 'bg-(--color-ink)/6 text-(--color-ink)/60'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-28">
                    {dateOrder.length === 0 && (
                        <div className="flex flex-col items-center gap-2 pt-16 text-center">
                            <Search className="h-8 w-8 text-(--color-ink)/25" />
                            <p className="text-sm text-(--color-ink)/45">
                                Tidak ada hasil ditemukan
                            </p>
                        </div>
                    )}

                    {dateOrder.map((date) => (
                        <div key={date}>
                            <p className="mb-2 text-xs font-medium text-(--color-ink)/45">
                                {date}
                            </p>
                            <div className="space-y-2">
                                {grouped[date].map((entry) => {
                                    const meta = statusMeta[entry.status];
                                    const StatusIcon = meta.icon;

                                    return (
                                        <div
                                            key={entry.id}
                                            className="flex items-center gap-3 rounded-xl border border-(--color-ink)/8 bg-(--color-surface) px-3.5 py-3"
                                        >
                                            <div
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.className}`}
                                            >
                                                <StatusIcon className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-(--color-ink)">
                                                    {entry.visitor}
                                                </p>
                                                <p className="text-xs text-(--color-ink)/45">
                                                    {entry.unit}
                                                </p>
                                            </div>
                                            <p className="shrink-0 text-xs text-(--color-ink)/40">
                                                {entry.time}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <SecurityBottomNav active="history" />
            </div>
        </>
    );
}

SecurityHistory.layout = (page: React.ReactNode) => page;
