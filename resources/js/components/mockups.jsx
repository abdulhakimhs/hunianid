function Frame({ children, className = '' }) {
    return (
        <div
            className={`shadow-elevated rounded-3xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-4 text-[color:var(--color-ink)] ${className}`}
        >
            {children}
        </div>
    );
}

export function MockupChat() {
    return (
        <Frame className="space-y-2.5">
            <div className="flex items-center gap-2 border-b border-[color:var(--color-ink)]/8 pb-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-mint)]" />
                <p className="font-mono text-[11px] text-[color:var(--color-ink)]/45">
                    WhatsApp • Pos Satpam Blok C
                </p>
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[color:var(--color-bg)] px-3 py-2 text-[13px] leading-snug">
                Tamu saya jam 10, nama Budi
            </div>
            <div className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-[color:var(--color-mint)] px-3 py-2 text-[13px] leading-snug text-white">
                Siap, QR sudah dibuat
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[color:var(--color-bg)] px-3 py-2 text-[13px] leading-snug">
                Pak, air di blok C.2 mati dari pagi
            </div>
        </Frame>
    );
}

export function MockupProcessing() {
    const rows = [
        { label: 'QR tamu dibuat', done: true },
        { label: 'Tagihan IPL dicatat', done: true },
        { label: 'Komplain dikategorikan: Air', done: false },
    ];
    return (
        <Frame className="space-y-3">
            <p className="font-mono text-[11px] tracking-wide text-[color:var(--color-sky-deep)] uppercase">
                AI memproses
            </p>
            {rows.map((row) => (
                <div key={row.label} className="flex items-center gap-2.5">
                    <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                            row.done
                                ? 'icon-chip-ai text-white'
                                : 'border-2 border-dashed border-[color:var(--color-sky)] text-[color:var(--color-sky-deep)]'
                        }`}
                    >
                        {row.done ? '✓' : '…'}
                    </span>
                    <span className="text-[13px] text-[color:var(--color-ink)]/75">
                        {row.label}
                    </span>
                </div>
            ))}
        </Frame>
    );
}

export function MockupDashboard() {
    const stats = [
        { label: 'Tamu hari ini', value: '12' },
        { label: 'Tagihan lunas', value: '87%' },
        { label: 'Komplain terbuka', value: '3' },
    ];
    return (
        <Frame>
            <div className="mb-3 flex items-center gap-1.5 border-b border-[color:var(--color-ink)]/8 pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-coral)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-sky)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-mint)]" />
                <span className="ml-2 font-mono text-[11px] text-[color:var(--color-ink)]/45">
                    Dashboard Pengurus
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {stats.map((s) => (
                    <div
                        key={s.label}
                        className="rounded-xl bg-[color:var(--color-bg)] p-2.5 text-center"
                    >
                        <p className="font-mono text-base font-semibold text-[color:var(--color-ink)]">
                            {s.value}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight text-[color:var(--color-ink)]/55">
                            {s.label}
                        </p>
                    </div>
                ))}
            </div>
        </Frame>
    );
}

export function MockupVisitorPass() {
    return (
        <Frame className="flex items-center justify-between gap-3">
            <div className="rounded-xl bg-[color:var(--color-bg)] px-3 py-2 text-[12px] leading-snug">
                Tamu jam 10, nama Budi
            </div>
            <svg
                viewBox="0 0 24 12"
                className="h-3 w-6 shrink-0 text-[color:var(--color-sky)]"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M0 6h22M17 1l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <div
                className="icon-chip-ai grid h-12 w-12 shrink-0 grid-cols-4 grid-rows-4 gap-[2px] rounded-lg p-1.5"
                aria-hidden="true"
            >
                {[...Array(16)].map((_, i) => (
                    <span
                        key={i}
                        className="rounded-[1px]"
                        style={{
                            background: [
                                0, 1, 3, 4, 7, 8, 11, 12, 14, 15,
                            ].includes(i)
                                ? '#fff'
                                : 'transparent',
                        }}
                    />
                ))}
            </div>
        </Frame>
    );
}

export function MockupBilling() {
    const rows = [
        { unit: 'A-12', amount: 'Rp250.000', status: 'Lunas', ok: true },
        { unit: 'B-04', amount: 'Rp250.000', status: 'Nunggak', ok: false },
        { unit: 'C-21', amount: 'Rp275.000', status: 'Lunas', ok: true },
    ];
    return (
        <Frame className="space-y-2">
            {rows.map((r) => (
                <div
                    key={r.unit}
                    className="flex items-center justify-between rounded-xl bg-[color:var(--color-bg)] px-3 py-2"
                >
                    <span className="font-mono text-[12px] text-[color:var(--color-ink)]/65">
                        {r.unit}
                    </span>
                    <span className="font-mono text-[12px] font-medium">
                        {r.amount}
                    </span>
                    <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                            color: r.ok
                                ? 'var(--color-mint-deep)'
                                : 'var(--color-coral)',
                            background: r.ok
                                ? 'color-mix(in srgb, var(--color-mint) 16%, transparent)'
                                : 'color-mix(in srgb, var(--color-coral) 14%, transparent)',
                        }}
                    >
                        {r.status}
                    </span>
                </div>
            ))}
        </Frame>
    );
}

export function MockupTicket() {
    return (
        <Frame className="space-y-3">
            <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-[color:var(--color-bg)] px-3 py-2 text-[13px] leading-snug">
                Pak, keran air di taman bocor
            </div>
            <div className="flex items-center justify-center">
                <svg
                    viewBox="0 0 12 24"
                    className="h-6 w-3 text-[color:var(--color-ink)]/20"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M6 0v22M1 17l5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/[0.07] px-3 py-2.5">
                <div>
                    <p className="text-[13px] font-semibold">Tiket #114</p>
                    <span className="font-mono text-[10px] tracking-wide text-[color:var(--color-sky-deep)] uppercase">
                        AI: Kategori Perpipaan
                    </span>
                </div>
                <span className="icon-chip-ai grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold text-white">
                    P
                </span>
            </div>
        </Frame>
    );
}

export function MockupBroadcast() {
    return (
        <Frame className="space-y-2.5">
            <div className="flex items-center gap-2">
                <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-[color:var(--color-mint-deep)]"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M12 3a5 5 0 0 0-5 5v3.5L5 15v1h14v-1l-2-3.5V8a5 5 0 0 0-5-5Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M10 18a2 2 0 0 0 4 0"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                    />
                </svg>
                <span className="font-mono text-[11px] tracking-wide text-[color:var(--color-ink)]/45 uppercase">
                    Pengumuman
                </span>
            </div>
            <div className="rounded-xl bg-[color:var(--color-bg)] p-3">
                <p className="text-[13px] font-semibold">
                    Pemadaman air 20 Agustus
                </p>
                <p className="mt-1 text-[12px] leading-snug text-[color:var(--color-ink)]/60">
                    PDAM akan melakukan perbaikan pipa utama pukul
                    09.00–14.00...
                </p>
            </div>
        </Frame>
    );
}
