import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    MockupChat,
    MockupProcessing,
    MockupDashboard,
    MockupVisitorPass,
    MockupBilling,
    MockupTicket,
    MockupBroadcast,
} from '../components/mockups.jsx';
import Reveal from '../components/reveal.jsx';

const NAV_LINKS = [
    { href: '#cara-kerja', label: 'Cara Kerja' },
    { href: '#fitur', label: 'Fitur' },
    { href: '#harga', label: 'Harga' },
    { href: '#faq', label: 'FAQ' },
];

const VALUE_CHIPS = [
    'Mulai gratis untuk RT kecil',
    'Setup dalam hitungan hari',
    'Data terpisah per RT',
];

const COMPARISON = [
    {
        old: 'Buku tamu kertas ilang, ga tau siapa yang masuk kemarin',
        now: 'Tamu tercatat otomatis, riwayat bisa dicek kapan saja',
    },
    {
        old: 'Nagih IPL harus WA satu-satu, ada yang nunggak ga ketauan',
        now: 'Status tagihan tiap unit kelihatan jelas, real-time',
    },
    {
        old: 'Komplain warga numpuk di grup WA, hilang ketimbun chat lain',
        now: 'Komplain otomatis jadi tiket, terarah ke petugas yang tepat',
    },
];

const STEPS = [
    {
        number: '01',
        title: 'Warga chat lewat WhatsApp',
        desc: 'Ga perlu install aplikasi baru — tinggal chat seperti biasa ke nomor perumahan.',
        mockup: MockupChat,
    },
    {
        number: '02',
        title: 'AI catat otomatis ke sistem',
        desc: 'Pesan diubah jadi data terstruktur: QR tamu dibuat, tagihan dicatat, komplain dikategorikan.',
        mockup: MockupProcessing,
    },
    {
        number: '03',
        title: 'Pengurus & satpam lihat semuanya di satu tempat',
        desc: 'Satu dashboard untuk pantau tamu, tagihan, dan komplain — real-time.',
        mockup: MockupDashboard,
    },
];

const FEATURES = [
    {
        title: 'Tamu ga perlu nunggu di gerbang',
        subtitle: 'Visitor Pass · AI',
        desc: 'Warga buat QR tamu lewat WhatsApp, satpam scan, selesai — tanpa buku tamu kertas.',
        kind: 'ai',
        mockup: MockupVisitorPass,
    },
    {
        title: 'Tagihan ga ada yang kececer',
        subtitle: 'Billing',
        desc: 'Semua tagihan IPL tercatat rapi, status lunas atau nunggak langsung kelihatan.',
        kind: 'human',
        mockup: MockupBilling,
    },
    {
        title: 'Komplain langsung ke tukang yang benar',
        subtitle: 'Maintenance · AI',
        desc: 'Chat komplain otomatis jadi tiket, terarah ke petugas yang tepat — ga numpuk di grup.',
        kind: 'ai',
        mockup: MockupTicket,
    },
    {
        title: 'Warga tau info penting, ga ketimbun chat grup',
        subtitle: 'Broadcast',
        desc: 'Pengumuman resmi terkirim rapi, bisa dicek ulang kapan saja tanpa scroll chat.',
        kind: 'human',
        mockup: MockupBroadcast,
    },
];

const PLANS = [
    {
        name: 'Free Trial',
        price: 'Gratis',
        period: '15 hari',
        desc: 'Coba semua fitur inti tanpa komitmen.',
        features: [
            'Tamu, Tagihan, Komplain, Broadcast',
            '1 RT / komplek',
            'Sampai 50 unit',
            'Support via WhatsApp',
        ],
        cta: 'Mulai Trial',
        highlight: false,
    },
    {
        name: 'Standard',
        price: 'Rp149rb',
        period: '/bulan',
        desc: 'Untuk RT yang sudah pakai HunianID sehari-hari.',
        features: [
            'Semua fitur Free Trial',
            'Unit tanpa batas untuk 1 RT',
            'Riwayat & laporan tak terbatas',
            'Support prioritas',
        ],
        cta: 'Pilih Standard',
        highlight: true,
    },
    {
        name: 'Custom',
        price: 'Hubungi Kami',
        period: '',
        desc: 'Untuk gabungan beberapa lingkungan atau kebutuhan khusus.',
        features: [
            'Multi-RT dalam 1 komplek',
            'Dashboard gabungan untuk pengelola',
            'Audit trail lengkap',
            'Onboarding & support khusus',
        ],
        cta: 'Hubungi Kami',
        highlight: false,
    },
];

const FAQS = [
    {
        q: 'Warga saya gaptek, gimana?',
        a: 'Ga masalah. Fitur utama pakai WhatsApp yang sudah dipakai sehari-hari — warga ga perlu download atau belajar aplikasi baru.',
    },
    {
        q: 'Data kami aman ga?',
        a: 'Aman. Data tamu, tagihan, dan komplain perumahan Anda tersimpan terpisah dan hanya bisa diakses pengurus yang berwenang.',
    },
    {
        q: 'Berapa lama setup-nya?',
        a: 'Biasanya perumahan bisa mulai jalan dalam hitungan hari, bukan minggu — tinggal daftarkan nomor WA dan data unit.',
    },
    {
        q: 'Bisa buat 2 RT dalam 1 komplek?',
        a: 'Bisa. Ini justru salah satu kasus penggunaan yang didukung — tiap RT punya data dan pengurusnya sendiri dalam satu komplek.',
    },
];

function IconTornLog() {
    return (
        <svg
            viewBox="0 0 48 48"
            fill="none"
            className="h-9 w-9"
            aria-hidden="true"
        >
            <path
                d="M10 6h22l6 6v30l-4-2-4 2-4-2-4 2-4-2-4 2-4-2V6Z"
                stroke="var(--color-coral)"
                strokeWidth="2"
                strokeLinejoin="round"
                fill="var(--color-surface)"
            />
            <path
                d="M16 16h16M16 22h16M16 28h10"
                stroke="var(--color-coral)"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M32 6v6h6"
                stroke="var(--color-coral)"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IconBillsStack() {
    return (
        <svg
            viewBox="0 0 48 48"
            fill="none"
            className="h-9 w-9"
            aria-hidden="true"
        >
            <rect
                x="8"
                y="20"
                width="28"
                height="16"
                rx="3"
                stroke="var(--color-coral)"
                strokeWidth="2"
                fill="var(--color-surface)"
            />
            <rect
                x="12"
                y="14"
                width="28"
                height="16"
                rx="3"
                stroke="var(--color-coral)"
                strokeWidth="2"
                fill="var(--color-surface)"
            />
            <path
                d="M18 21h16M18 26h10"
                stroke="var(--color-coral)"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconChatPile() {
    return (
        <svg
            viewBox="0 0 48 48"
            fill="none"
            className="h-9 w-9"
            aria-hidden="true"
        >
            <path
                d="M10 12a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-16l-6 5v-5H10a4 4 0 0 1-4-4v-6"
                stroke="var(--color-coral)"
                strokeWidth="2"
                strokeLinejoin="round"
                fill="var(--color-surface)"
            />
            <circle cx="18" cy="17" r="1.6" fill="var(--color-coral)" />
            <circle cx="24" cy="17" r="1.6" fill="var(--color-coral)" />
            <circle cx="30" cy="17" r="1.6" fill="var(--color-coral)" />
        </svg>
    );
}

const PAIN_ICONS = {
    log: IconTornLog,
    bills: IconBillsStack,
    chat: IconChatPile,
};
const PAIN_KEYS = ['log', 'bills', 'chat'];

function IconHouseGate() {
    return (
        <svg
            viewBox="0 0 64 64"
            fill="none"
            className="h-11 w-11"
            aria-hidden="true"
        >
            <path
                d="M10 28 32 12l22 16"
                stroke="var(--color-mint-deep)"
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
            <rect
                x="14"
                y="28"
                width="36"
                height="24"
                rx="2"
                stroke="var(--color-mint-deep)"
                strokeWidth="2.5"
                fill="var(--color-surface)"
            />
            <rect
                x="28"
                y="38"
                width="8"
                height="14"
                stroke="var(--color-mint)"
                strokeWidth="2.5"
                fill="var(--color-surface)"
            />
            <path
                d="M6 28h6M52 28h6"
                stroke="var(--color-mint-deep)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconCluster() {
    return (
        <svg
            viewBox="0 0 64 64"
            fill="none"
            className="h-11 w-11"
            aria-hidden="true"
        >
            <rect
                x="10"
                y="24"
                width="16"
                height="28"
                rx="2"
                stroke="var(--color-sky-deep)"
                strokeWidth="2.5"
                fill="var(--color-surface)"
            />
            <rect
                x="30"
                y="14"
                width="18"
                height="38"
                rx="2"
                stroke="var(--color-sky-deep)"
                strokeWidth="2.5"
                fill="var(--color-surface)"
            />
            <path
                d="M14 30h4M14 36h4M14 42h4M34 20h4M34 26h4M34 32h4M34 38h4"
                stroke="var(--color-sky)"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function ScrollProgress() {
    const barRef = useRef(null);

    useEffect(() => {
        let ticking = false;
        function update() {
            const scrollTop = window.scrollY;
            const height =
                document.documentElement.scrollHeight - window.innerHeight;
            const pct = height > 0 ? scrollTop / height : 0;
            barRef.current?.style.setProperty('--scroll', String(pct));
            ticking = false;
        }
        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    return (
        <div
            id="scroll-progress"
            ref={barRef}
            className="fixed top-0 right-0 left-0 z-50 h-[3px]"
            style={{
                background:
                    'linear-gradient(90deg, var(--color-sky), var(--color-mint))',
            }}
        />
    );
}

function FloatingChip({ className, children, delay = false }) {
    return (
        <div
            className={`chip-float ${delay ? 'chip-float-delay' : ''} shadow-elevated-lg absolute z-10 flex items-center gap-2 rounded-2xl border border-[color:var(--color-ink)]/6 bg-[color:var(--color-surface)] px-3.5 py-2.5 ${className}`}
        >
            {children}
        </div>
    );
}

function WaToQrVisual() {
    const wrapRef = useRef(null);

    function handleMouseMove(e) {
        const node = wrapRef.current;

        if (!node) {
            return;
        }

        const rect = node.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        node.style.setProperty('--mx', `${x}%`);
        node.style.setProperty('--my', `${y}%`);
    }

    return (
        <div
            ref={wrapRef}
            onMouseMove={handleMouseMove}
            className="relative mx-auto aspect-square w-full max-w-sm"
            style={{
                backgroundImage:
                    'radial-gradient(320px circle at var(--mx, 50%) var(--my, 30%), color-mix(in srgb, var(--color-sky) 18%, transparent), transparent 70%)',
            }}
        >
            <div
                className="blob mesh-drift absolute -top-8 -left-10 h-36 w-36 rounded-full bg-[color:var(--color-mint)]/25 blur-3xl"
                aria-hidden="true"
            />
            <div
                className="blob blob-delay mesh-drift absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-[color:var(--color-sky)]/30 blur-3xl"
                aria-hidden="true"
            />

            <div className="shadow-elevated-lg relative mx-auto flex h-full w-full max-w-[280px] flex-col rounded-[2.4rem] border-4 border-[color:var(--color-ink)] bg-[color:var(--color-ink)] p-2">
                <div className="relative flex-1 overflow-hidden rounded-[1.8rem] bg-[color:var(--color-bg)]">
                    <div
                        className="absolute top-0 right-0 left-0 z-10 flex items-center gap-2 px-3 py-2.5"
                        style={{
                            background:
                                'linear-gradient(135deg, var(--color-mint-deep), var(--color-mint))',
                        }}
                    >
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-white/25 text-[11px] font-semibold text-white">
                            RT
                        </span>
                        <span className="text-xs font-semibold text-white">
                            Pos Satpam Blok C
                        </span>
                    </div>

                    <div className="wa-qr-frame wa-qr-frame--1 absolute inset-0 flex items-center justify-center px-5 pt-12">
                        <div className="shadow-elevated w-full rounded-2xl rounded-bl-sm bg-[color:var(--color-surface)] p-3.5">
                            <p className="font-mono text-[10px] text-[color:var(--color-mint-deep)]">
                                09:58
                            </p>
                            <p className="mt-1 text-[15px] leading-snug text-[color:var(--color-ink)]">
                                Tamu saya jam 10, nama Budi
                            </p>
                        </div>
                    </div>

                    <div className="wa-qr-frame wa-qr-frame--2 absolute inset-0 flex items-center justify-center px-5 pt-12">
                        <div
                            className="shadow-elevated flex items-center gap-3 rounded-2xl px-5 py-4"
                            style={{
                                background:
                                    'linear-gradient(135deg, #38d9f5, #2fc2e8)',
                            }}
                        >
                            <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-white" />
                            <span className="ml-1 font-mono text-[11px] text-white">
                                AI mencatat…
                            </span>
                        </div>
                    </div>

                    <div className="wa-qr-frame wa-qr-frame--3 absolute inset-0 flex items-center justify-center px-5 pt-12">
                        <div className="shadow-elevated rounded-2xl bg-[color:var(--color-surface)] p-4 text-center">
                            <div
                                className="mx-auto grid h-28 w-28 grid-cols-5 grid-rows-5 gap-1 rounded-xl p-2"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #38d9f5, #2fc2e8)',
                                }}
                                aria-hidden="true"
                            >
                                {[...Array(25)].map((_, i) => (
                                    <span
                                        key={i}
                                        className="rounded-[1px]"
                                        style={{
                                            background: [
                                                0, 1, 3, 4, 6, 8, 12, 16, 18,
                                                20, 21, 23, 24,
                                            ].includes(i)
                                                ? '#fff'
                                                : 'transparent',
                                        }}
                                    />
                                ))}
                            </div>
                            <p className="mt-2.5 font-mono text-[11px] text-[color:var(--color-mint-deep)]">
                                Tamu: Budi · 10:00
                            </p>
                        </div>
                    </div>

                    <div className="wa-qr-frame wa-qr-frame--4 absolute inset-0 flex items-center justify-center px-5 pt-12">
                        <div className="flex w-full flex-col gap-2">
                            <div className="shadow-elevated w-full rounded-2xl rounded-bl-sm bg-[color:var(--color-surface)] p-3">
                                <p className="font-mono text-[10px] text-[color:var(--color-mint-deep)]">
                                    14:02
                                </p>
                                <p className="mt-1 text-[13px] leading-snug text-[color:var(--color-ink)]">
                                    Pompa air mati nih
                                </p>
                            </div>
                            <div
                                className="shadow-elevated ml-6 flex items-start gap-2 rounded-2xl rounded-br-sm p-3"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #38d9f5, #2fc2e8)',
                                }}
                            >
                                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/25 text-[9px] font-bold text-white">
                                    AI
                                </span>
                                <p className="text-[13px] leading-snug text-white">
                                    Mau list tukang service, atau kita buatkan
                                    tiket buat pengelola?
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FloatingChip className="top-6 -right-4 sm:-right-8" delay={false}>
                <span className="icon-chip-ai grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white">
                    AI
                </span>
                <span className="text-[11px] font-semibold text-[color:var(--color-ink)]">
                    mencatat otomatis
                </span>
            </FloatingChip>

            <FloatingChip className="bottom-10 -left-4 sm:-left-10" delay>
                <svg
                    viewBox="0 0 16 16"
                    className="h-4 w-4 text-[color:var(--color-mint-deep)]"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M3 8.5 6.5 12 13 4.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                <span className="text-[11px] font-semibold text-[color:var(--color-ink)]">
                    Tagihan lunas
                </span>
            </FloatingChip>
        </div>
    );
}

function SectionLabel({ children, tone = 'sky' }) {
    const color =
        tone === 'mint' ? 'var(--color-mint-deep)' : 'var(--color-sky-deep)';

    return (
        <p
            className="font-mono text-xs font-medium tracking-[0.18em] uppercase"
            style={{ color }}
        >
            {children}
        </p>
    );
}

function Faq({ item, open, onToggle }) {
    return (
        <div className="py-1">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left font-display text-base font-semibold"
            >
                {item.q}
                <span
                    className={`icon-chip-ai grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-base text-white transition-transform duration-300 ${
                        open ? 'rotate-45' : ''
                    }`}
                >
                    +
                </span>
            </button>
            <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
                <div className="overflow-hidden">
                    <p className="pb-4 text-sm leading-relaxed text-[color:var(--color-ink)]/70">
                        {item.a}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function Landing() {
    const [openFaq, setOpenFaq] = useState(0);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        function onScroll() {
            setScrolled(window.scrollY > 8);
        }
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <>
            <Head title="HunianID — Kelola Perumahan Tanpa Ribet Catat Manual" />

            <div className="min-h-screen overflow-x-hidden bg-[color:var(--color-bg)] font-sans text-[color:var(--color-ink)] antialiased">
                <ScrollProgress />

                {/* NAV */}
                <header
                    className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
                        scrolled
                            ? 'border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/90 shadow-sm backdrop-blur'
                            : 'border-transparent bg-transparent'
                    }`}
                >
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
                        <span className="font-display text-lg font-bold tracking-tight">
                            Hunian
                            <span className="text-[color:var(--color-sky-deep)]">
                                ID
                            </span>
                        </span>
                        <nav className="hidden items-center gap-8 md:flex">
                            {NAV_LINKS.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="text-sm font-medium text-[color:var(--color-ink)]/75 transition hover:text-[color:var(--color-ink)]"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                        <a
                            href="#daftar"
                            className="shadow-elevated rounded-full bg-[color:var(--color-ink)] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
                        >
                            Daftarkan Perumahan
                        </a>
                    </div>
                </header>

                {/* HERO */}
                <section className="dot-grid relative overflow-hidden">
                    <div
                        className="blob mesh-drift absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-[color:var(--color-mint)]/20 blur-3xl"
                        aria-hidden="true"
                    />
                    <div
                        className="blob blob-delay mesh-drift absolute top-10 -right-16 h-64 w-64 rounded-full bg-[color:var(--color-sky)]/20 blur-3xl"
                        aria-hidden="true"
                    />

                    <div className="relative mx-auto max-w-6xl px-5 pt-14 pb-24 md:pt-20">
                        <div className="grid items-center gap-12 md:grid-cols-2">
                            <div>
                                <Reveal>
                                    <SectionLabel>
                                        Untuk RT &amp; pengelola perumahan
                                    </SectionLabel>
                                </Reveal>
                                <Reveal
                                    delay={80}
                                    as="h1"
                                    className="mt-4 font-display text-4xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl"
                                >
                                    Kelola perumahan tanpa ribet catat manual
                                </Reveal>
                                <Reveal
                                    delay={160}
                                    as="p"
                                    className="mt-5 max-w-md text-lg leading-relaxed text-[color:var(--color-ink)]/75"
                                >
                                    Satu aplikasi untuk tagihan, tamu, komplain,
                                    dan lapor warga — cukup chat WhatsApp,
                                    sisanya otomatis.
                                </Reveal>
                                <Reveal
                                    delay={240}
                                    className="mt-8 flex flex-wrap items-center gap-4"
                                >
                                    <a
                                        href="#daftar"
                                        className="pulse-cta shadow-elevated-lg rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                                        style={{
                                            background:
                                                'linear-gradient(135deg, var(--color-sky-deep), var(--color-sky))',
                                        }}
                                    >
                                        Daftarkan Perumahan Anda
                                    </a>
                                    <a
                                        href="#cara-kerja"
                                        className="text-sm font-semibold text-[color:var(--color-ink)] underline decoration-[color:var(--color-mint)] decoration-2 underline-offset-4"
                                    >
                                        Lihat Cara Kerjanya
                                    </a>
                                </Reveal>
                                <Reveal
                                    delay={320}
                                    className="mt-10 flex flex-wrap gap-2.5"
                                >
                                    {VALUE_CHIPS.map((chip) => (
                                        <span
                                            key={chip}
                                            className="shadow-elevated flex items-center gap-1.5 rounded-full border border-[color:var(--color-ink)]/6 bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-ink)]/70"
                                        >
                                            <svg
                                                viewBox="0 0 16 16"
                                                className="h-3.5 w-3.5 text-[color:var(--color-mint-deep)]"
                                                fill="none"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    d="M3 8.5 6.5 12 13 4.5"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                            {chip}
                                        </span>
                                    ))}
                                </Reveal>
                            </div>

                            <Reveal delay={120}>
                                <WaToQrVisual />
                                <p className="mt-6 text-center font-mono text-xs text-[color:var(--color-ink)]/45">
                                    dari pesan WhatsApp jadi QR tamu — otomatis
                                </p>
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* PROBLEM / COMPARISON */}
                <section className="bg-[color:var(--color-surface)]">
                    <div className="mx-auto max-w-6xl px-5 py-20">
                        <Reveal>
                            <SectionLabel tone="mint">
                                Sebelum vs sesudah
                            </SectionLabel>
                        </Reveal>
                        <Reveal
                            delay={80}
                            as="h2"
                            className="mt-3 max-w-xl font-display text-2xl font-bold text-balance sm:text-3xl"
                        >
                            Ribet catat manual, vs otomatis tercatat tiap hari
                        </Reveal>
                        <div className="mt-12 grid gap-6 sm:grid-cols-3">
                            {COMPARISON.map((item, i) => {
                                const Icon = PAIN_ICONS[PAIN_KEYS[i]];

                                return (
                                    <Reveal key={item.old} delay={i * 100}>
                                        <div className="tilt-card shadow-elevated h-full rounded-3xl border border-[color:var(--color-ink)]/6 bg-[color:var(--color-bg)] p-6 hover:shadow-xl">
                                            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[color:var(--color-coral)]/10">
                                                <Icon />
                                            </span>
                                            <p className="mt-4 text-[15px] leading-snug font-medium text-[color:var(--color-ink)]/80 line-through decoration-[color:var(--color-coral)]/50">
                                                {item.old}
                                            </p>
                                            <div className="mt-4 flex items-start gap-2 border-t border-[color:var(--color-ink)]/8 pt-4">
                                                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--color-mint)]/15">
                                                    <svg
                                                        viewBox="0 0 16 16"
                                                        className="h-3 w-3 text-[color:var(--color-mint-deep)]"
                                                        fill="none"
                                                        aria-hidden="true"
                                                    >
                                                        <path
                                                            d="M3 8.5 6.5 12 13 4.5"
                                                            stroke="currentColor"
                                                            strokeWidth="2.2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </span>
                                                <p className="text-[14px] leading-snug font-semibold text-[color:var(--color-ink)]">
                                                    {item.now}
                                                </p>
                                            </div>
                                        </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section
                    id="cara-kerja"
                    className="mx-auto max-w-6xl px-5 py-20"
                >
                    <Reveal>
                        <SectionLabel>Cara kerja</SectionLabel>
                    </Reveal>
                    <Reveal
                        delay={80}
                        as="h2"
                        className="mt-3 max-w-xl font-display text-2xl font-bold text-balance sm:text-3xl"
                    >
                        Tiga langkah, dari chat sampai tercatat
                    </Reveal>
                    <div className="relative mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
                        <div
                            className="absolute top-6 right-0 left-0 hidden h-px bg-[color:var(--color-ink)]/10 md:block"
                            aria-hidden="true"
                        />
                        {STEPS.map((step, i) => {
                            const Mockup = step.mockup;

                            return (
                                <Reveal
                                    key={step.number}
                                    delay={i * 140}
                                    className="relative"
                                >
                                    <span
                                        className="shadow-elevated relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-full font-mono text-sm font-semibold text-white"
                                        style={{
                                            background:
                                                'linear-gradient(135deg, var(--color-sky-deep), var(--color-sky))',
                                        }}
                                    >
                                        {step.number}
                                    </span>
                                    <h3 className="mt-4 font-display text-lg font-bold">
                                        {step.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-ink)]/70">
                                        {step.desc}
                                    </p>
                                    <div className="tilt-card mt-5">
                                        <Mockup />
                                    </div>
                                </Reveal>
                            );
                        })}
                    </div>
                </section>

                {/* FEATURES */}
                <section
                    id="fitur"
                    className="relative overflow-hidden bg-[color:var(--color-ink)] text-white"
                >
                    <div
                        className="blob mesh-drift absolute top-0 right-0 h-96 w-96 rounded-full bg-[color:var(--color-sky)]/10 blur-3xl"
                        aria-hidden="true"
                    />
                    <div className="relative mx-auto max-w-6xl px-5 py-20">
                        <Reveal>
                            <p className="font-mono text-xs font-medium tracking-[0.18em] text-[color:var(--color-sky)] uppercase">
                                Fitur
                            </p>
                        </Reveal>
                        <Reveal
                            delay={80}
                            as="h2"
                            className="mt-3 max-w-xl font-display text-2xl font-bold text-balance sm:text-3xl"
                        >
                            Yang beres tiap hari, tanpa Anda kejar-kejar
                        </Reveal>
                        <Reveal
                            delay={140}
                            className="mt-4 flex flex-wrap gap-4 text-xs text-white/60"
                        >
                            <span className="flex items-center gap-1.5">
                                <span className="icon-chip-ai h-2.5 w-2.5 rounded-full" />{' '}
                                otomatis oleh AI
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-mint)]" />{' '}
                                aktivitas warga &amp; pengurus
                            </span>
                        </Reveal>
                        <div className="mt-10 grid gap-6 sm:grid-cols-2">
                            {FEATURES.map((f, i) => {
                                const Mockup = f.mockup;
                                const isAi = f.kind === 'ai';

                                return (
                                    <Reveal key={f.title} delay={i * 100}>
                                        <div className="tilt-card h-full rounded-3xl border border-white/10 bg-white/5 p-6 hover:border-white/20 hover:bg-white/[0.08]">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`h-2 w-2 rounded-full ${isAi ? 'icon-chip-ai' : ''}`}
                                                    style={
                                                        !isAi
                                                            ? {
                                                                  background:
                                                                      'var(--color-mint)',
                                                              }
                                                            : undefined
                                                    }
                                                />
                                                <span
                                                    className="font-mono text-xs font-medium tracking-wide uppercase"
                                                    style={{
                                                        color: isAi
                                                            ? 'var(--color-sky)'
                                                            : 'var(--color-mint)',
                                                    }}
                                                >
                                                    {f.subtitle}
                                                </span>
                                            </div>
                                            <h3 className="mt-2 font-display text-lg font-bold text-balance">
                                                {f.title}
                                            </h3>
                                            <p className="mt-2 text-sm leading-relaxed text-white/65">
                                                {f.desc}
                                            </p>
                                            <div className="mt-5">
                                                <Mockup />
                                            </div>
                                        </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* SEGMENT SPLIT */}
                <section className="mx-auto max-w-6xl px-5 py-20">
                    <Reveal>
                        <SectionLabel tone="mint">Untuk siapa</SectionLabel>
                    </Reveal>
                    <Reveal
                        delay={80}
                        as="h2"
                        className="mt-3 max-w-xl font-display text-2xl font-bold text-balance sm:text-3xl"
                    >
                        Satu produk, dua cara pakai
                    </Reveal>
                    <div className="mt-12 grid gap-6 md:grid-cols-2">
                        <Reveal delay={0}>
                            <div className="tilt-card shadow-elevated h-full rounded-3xl border border-[color:var(--color-mint)]/25 bg-[color:var(--color-surface)] p-8 hover:shadow-xl">
                                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[color:var(--color-mint)]/10">
                                    <IconHouseGate />
                                </span>
                                <h3 className="mt-4 font-display text-xl font-bold">
                                    Untuk RT
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-ink)]/70">
                                    Ga perlu jadi jago teknologi — semua lewat
                                    WhatsApp yang sudah biasa dipakai. Pengurus
                                    tetap pegang kendali persetujuan tamu dan
                                    tagihan, dengan biaya yang ringan untuk RT
                                    kecil.
                                </p>
                            </div>
                        </Reveal>
                        <Reveal delay={120}>
                            <div className="tilt-card shadow-elevated h-full rounded-3xl border border-[color:var(--color-sky)]/25 bg-[color:var(--color-surface)] p-8 hover:shadow-xl">
                                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[color:var(--color-sky)]/10">
                                    <IconCluster />
                                </span>
                                <h3 className="mt-4 font-display text-xl font-bold">
                                    Untuk Pengelola / Developer
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-ink)]/70">
                                    Pantau banyak unit sekaligus, tampil lebih
                                    profesional di mata warga dan board, dan
                                    punya jejak audit yang rapi untuk tiap
                                    transaksi dan komplain.
                                </p>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* PRICING */}
                <section id="harga" className="bg-[color:var(--color-surface)]">
                    <div className="mx-auto max-w-6xl px-5 py-20">
                        <div className="text-center">
                            <Reveal>
                                <SectionLabel tone="mint">Harga</SectionLabel>
                            </Reveal>
                            <Reveal
                                delay={80}
                                as="h2"
                                className="mx-auto mt-3 max-w-lg font-display text-2xl font-bold text-balance sm:text-3xl"
                            >
                                Harga menyesuaikan jumlah unit
                            </Reveal>
                            <Reveal
                                delay={140}
                                as="p"
                                className="mt-2 font-mono text-sm text-[color:var(--color-mint-deep)]"
                            >
                                mulai gratis untuk RT kecil
                            </Reveal>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-3 md:items-start">
                            {PLANS.map((plan, i) => (
                                <Reveal
                                    key={plan.name}
                                    delay={i * 100}
                                    className="h-full"
                                >
                                    <div
                                        className={`tilt-card relative flex h-full flex-col rounded-3xl border p-8 ${
                                            plan.highlight
                                                ? 'shadow-elevated-lg border-[color:var(--color-sky)]/40 bg-[color:var(--color-surface)] md:-translate-y-3'
                                                : 'shadow-elevated border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]'
                                        }`}
                                    >
                                        {plan.highlight && (
                                            <span
                                                className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold text-white"
                                                style={{
                                                    background:
                                                        'linear-gradient(135deg, var(--color-sky-deep), var(--color-sky))',
                                                }}
                                            >
                                                Paling Populer
                                            </span>
                                        )}
                                        <h3 className="font-display text-lg font-bold">
                                            {plan.name}
                                        </h3>
                                        <p className="mt-1 text-sm text-[color:var(--color-ink)]/60">
                                            {plan.desc}
                                        </p>
                                        <div className="mt-5 flex items-baseline gap-1.5">
                                            <span className="font-mono text-3xl font-semibold text-[color:var(--color-ink)]">
                                                {plan.price}
                                            </span>
                                            {plan.period && (
                                                <span className="font-mono text-sm text-[color:var(--color-ink)]/50">
                                                    {plan.period}
                                                </span>
                                            )}
                                        </div>
                                        <ul className="mt-6 flex-1 space-y-3">
                                            {plan.features.map((feature) => (
                                                <li
                                                    key={feature}
                                                    className="flex items-start gap-2.5 text-sm text-[color:var(--color-ink)]/75"
                                                >
                                                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--color-mint)]/15">
                                                        <svg
                                                            viewBox="0 0 16 16"
                                                            className="h-3 w-3 text-[color:var(--color-mint-deep)]"
                                                            fill="none"
                                                            aria-hidden="true"
                                                        >
                                                            <path
                                                                d="M3 8.5 6.5 12 13 4.5"
                                                                stroke="currentColor"
                                                                strokeWidth="2.2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </span>
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <a
                                            href="#daftar"
                                            className={`mt-8 inline-block rounded-full px-5 py-2.5 text-center text-sm font-semibold transition hover:-translate-y-0.5 ${
                                                plan.highlight
                                                    ? 'shadow-elevated text-white'
                                                    : 'border border-[color:var(--color-ink)]/15 text-[color:var(--color-ink)] hover:shadow-md'
                                            }`}
                                            style={
                                                plan.highlight
                                                    ? {
                                                          background:
                                                              'linear-gradient(135deg, var(--color-sky-deep), var(--color-sky))',
                                                      }
                                                    : undefined
                                            }
                                        >
                                            {plan.cta}
                                        </a>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="bg-[color:var(--color-surface)]">
                    <div className="mx-auto max-w-3xl px-5 py-20">
                        <Reveal>
                            <SectionLabel>Pertanyaan umum</SectionLabel>
                        </Reveal>
                        <Reveal
                            delay={80}
                            as="h2"
                            className="mt-3 font-display text-2xl font-bold text-balance sm:text-3xl"
                        >
                            Yang biasa ditanyakan
                        </Reveal>
                        <Reveal
                            delay={140}
                            className="mt-8 divide-y divide-[color:var(--color-ink)]/8 border-t border-b border-[color:var(--color-ink)]/8"
                        >
                            {FAQS.map((item, i) => (
                                <Faq
                                    key={item.q}
                                    item={item}
                                    open={openFaq === i}
                                    onToggle={() =>
                                        setOpenFaq(openFaq === i ? -1 : i)
                                    }
                                />
                            ))}
                        </Reveal>
                    </div>
                </section>

                {/* FINAL CTA */}
                <section
                    id="daftar"
                    className="relative overflow-hidden py-20 text-center"
                >
                    <div
                        className="blob mesh-drift absolute top-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[color:var(--color-sky)]/15 blur-3xl"
                        aria-hidden="true"
                    />
                    <Reveal className="relative mx-auto max-w-6xl px-5">
                        <h2 className="mx-auto max-w-lg font-display text-2xl font-bold text-balance sm:text-3xl">
                            Siap kelola perumahan tanpa ribet catat manual?
                        </h2>
                        <a
                            href="/register"
                            className="pulse-cta shadow-elevated-lg mt-8 inline-block rounded-full px-7 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                            style={{
                                background:
                                    'linear-gradient(135deg, var(--color-sky-deep), var(--color-sky))',
                            }}
                        >
                            Daftarkan Perumahan Anda
                        </a>
                    </Reveal>
                </section>

                {/* FOOTER */}
                <footer className="border-t border-[color:var(--color-ink)]/8">
                    <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
                        <span className="font-display text-base font-bold">
                            Hunian
                            <span className="text-[color:var(--color-sky-deep)]">
                                ID
                            </span>
                        </span>
                        <p className="text-sm text-[color:var(--color-ink)]/55">
                            Hubungi kami:{' '}
                            <a
                                href="mailto:halo@hunianid.com"
                                className="underline"
                            >
                                halo@hunianid.com
                            </a>
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
