// resources/js/components/mockup-panic.jsx
// Matches the other mockups: sits inside a dark feature card, so the two
// panels are light/red "screens" that pop against it.

function IconOctagonAlert() {
    return (
        <svg
            viewBox="0 0 32 32"
            fill="none"
            className="h-8 w-8"
            aria-hidden="true"
        >
            <path
                d="M11 4h10l7 7v10l-7 7H11l-7-7V11l7-7Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path
                d="M16 10v7M16 21.5v.5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function MockupPanic() {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {/* Resident: hold to send */}
            <div className="shadow-elevated rounded-2xl bg-(--color-surface) p-4 text-center">
                <p className="font-mono text-[10px] tracking-wide text-(--color-ink)/45 uppercase">
                    Aplikasi warga
                </p>

                <div className="relative mx-auto mt-3 grid h-28 w-28 place-items-center">
                    <svg
                        className="absolute inset-0 -rotate-90"
                        viewBox="0 0 112 112"
                        aria-hidden="true"
                    >
                        <circle
                            cx="56"
                            cy="56"
                            r="50"
                            fill="none"
                            strokeWidth="5"
                            className="stroke-red-100"
                        />
                        <circle
                            cx="56"
                            cy="56"
                            r="50"
                            fill="none"
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray="314"
                            strokeDashoffset="95"
                            className="stroke-red-500"
                        />
                    </svg>

                    <span className="grid h-20 w-20 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30">
                        <IconOctagonAlert />
                    </span>
                </div>

                <p className="mt-3 text-xs font-semibold text-(--color-ink)">
                    Tahan 2 detik
                </p>
                <p className="mt-0.5 text-[11px] text-(--color-ink)/50">
                    Salah pencet? Ada 15 detik untuk batalkan
                </p>
            </div>

            {/* Guard: full-screen alert */}
            <div className="shadow-elevated flex flex-col items-center justify-center rounded-2xl bg-red-600 p-4 text-center text-white">
                <p className="font-mono text-[10px] tracking-wide text-white/70 uppercase">
                    Layar satpam
                </p>

                <div className="relative mt-3 grid h-14 w-14 place-items-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
                    <span className="relative grid h-12 w-12 place-items-center rounded-full bg-white/15">
                        <IconOctagonAlert />
                    </span>
                </div>

                <p className="mt-3 text-[11px] font-semibold tracking-widest text-white/80 uppercase">
                    Panic Alert
                </p>
                <p className="text-lg leading-tight font-bold">Blok B-08</p>
                <p className="mt-0.5 text-[11px] text-white/75">
                    Dewi L. · 12 detik lalu
                </p>

                <span className="mt-3 rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-red-600">
                    Konfirmasi Diterima
                </span>
            </div>
        </div>
    );
}
