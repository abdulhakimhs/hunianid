import { Head } from '@inertiajs/react';
import {
    ArrowUpRight,
    BadgeCheck,
    BellRing,
    CircleDollarSign,
    Users,
} from 'lucide-react';
import { dashboard } from '@/routes';

const stats = [
    {
        label: 'Tamu hari ini',
        value: '14',
        hint: '+4 vs kemarin',
        icon: Users,
        tone: 'sky',
    },
    {
        label: 'Tagihan belum lunas',
        value: '3',
        hint: '1 butuh follow-up',
        icon: CircleDollarSign,
        tone: 'mint',
    },
    {
        label: 'Komplain tertangani',
        value: '8',
        hint: '2 menunggu verifikasi',
        icon: BadgeCheck,
        tone: 'coral',
    },
];

const activity = [
    'Tamu Budi masuk lewat QR pada 09:40',
    'Tagihan IPL blok C sudah dikirim ke warga',
    'Komplain pompa air diteruskan ke tukang',
];

export default function Dashboard() {
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-[color:var(--color-bg)] p-4 sm:p-6 lg:p-8">
                <section className="relative overflow-hidden rounded-[2rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-6 shadow-elevated lg:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_color-mix(in_srgb,_var(--color-sky)_16%,_transparent),_transparent_45%),radial-gradient(circle_at_bottom_right,_color-mix(in_srgb,_var(--color-mint)_16%,_transparent),_transparent_40%)]" />
                    <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="space-y-4">
                            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-sky-deep)]">
                                Dashboard pengelola perumahan
                            </p>
                            <h1 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-4xl">
                                Semua yang penting di satu tempat
                            </h1>
                            <p className="max-w-xl text-base leading-relaxed text-[color:var(--color-ink)]/70">
                                Tamu, tagihan, dan komplain kini tampil rapi seperti pengalaman landing page yang Anda pilih — cepat dipahami, mudah dipantau, dan siap dibagi ke pengurus.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/10 px-3 py-1.5 text-sm font-medium text-[color:var(--color-sky-deep)]">
                                    14 tamu hari ini
                                </span>
                                <span className="rounded-full border border-[color:var(--color-mint)]/25 bg-[color:var(--color-mint)]/10 px-3 py-1.5 text-sm font-medium text-[color:var(--color-mint-deep)]">
                                    3 tagihan belum lunas
                                </span>
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 p-4">
                            <div className="flex items-center justify-between">
                                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-ink)]/55">
                                    Aktivitas terbaru
                                </p>
                                <span className="rounded-full bg-[color:var(--color-sky)]/10 p-2 text-[color:var(--color-sky-deep)]">
                                    <BellRing className="h-4 w-4" />
                                </span>
                            </div>
                            <ul className="mt-4 space-y-3">
                                {activity.map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-start gap-2 rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] px-3 py-2.5 text-sm text-[color:var(--color-ink)]/70"
                                    >
                                        <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--color-mint)]" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                <div className="grid gap-4 md:grid-cols-3">
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        const toneClasses =
                            stat.tone === 'mint'
                                ? 'bg-[color:var(--color-mint)]/10 text-[color:var(--color-mint-deep)]'
                                : stat.tone === 'coral'
                                  ? 'bg-[color:var(--color-coral)]/10 text-[color:var(--color-coral)]'
                                  : 'bg-[color:var(--color-sky)]/10 text-[color:var(--color-sky-deep)]';

                        return (
                            <div
                                key={stat.label}
                                className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-5 shadow-elevated"
                            >
                                <div className={`inline-flex rounded-2xl p-2.5 ${toneClasses}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <p className="mt-4 text-sm text-[color:var(--color-ink)]/60">
                                    {stat.label}
                                </p>
                                <p className="mt-1 font-display text-3xl font-semibold text-[color:var(--color-ink)]">
                                    {stat.value}
                                </p>
                                <p className="mt-2 text-sm text-[color:var(--color-ink)]/60">
                                    {stat.hint}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-5 shadow-elevated">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-sky-deep)]">
                                    Agenda hari ini
                                </p>
                                <h2 className="mt-2 font-display text-xl font-semibold text-[color:var(--color-ink)]">
                                    Prioritas yang perlu ditindaklanjuti
                                </h2>
                            </div>
                            <a
                                href="#"
                                className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--color-sky-deep)]"
                            >
                                Lihat semua <ArrowUpRight className="h-4 w-4" />
                            </a>
                        </div>

                        <div className="mt-5 space-y-3">
                            {[
                                'Sampaikan update tagihan ke 3 unit yang masih menunggak',
                                'Buatkan tiket perbaikan pompa air untuk satpam',
                                'Cek daftar tamu untuk acara buka bersama sore ini',
                            ].map((item) => (
                                <div
                                    key={item}
                                    className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 px-3 py-3"
                                >
                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--color-mint)]" />
                                    <p className="text-sm leading-relaxed text-[color:var(--color-ink)]/70">
                                        {item}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-5 shadow-elevated">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-mint-deep)]">
                            Aksi cepat
                        </p>
                        <div className="mt-4 space-y-3">
                            {['Buat QR tamu', 'Kirim pengumuman', 'Lihat laporan mingguan'].map((action) => (
                                <button
                                    key={action}
                                    type="button"
                                    className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 px-3 py-3 text-left text-sm font-medium text-[color:var(--color-ink)]/75"
                                >
                                    <span>{action}</span>
                                    <ArrowUpRight className="h-4 w-4 text-[color:var(--color-sky-deep)]" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
