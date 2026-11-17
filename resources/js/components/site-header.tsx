import { Link } from '@inertiajs/react';
import HunianLogo from '@/components/hunian-logo';
import { home, login } from '@/routes';

const NAV_LINKS = [
    { hash: '#cara-kerja', label: 'Cara Kerja' },
    { hash: '#fitur', label: 'Fitur' },
    { hash: '#harga', label: 'Harga' },
    { hash: '#faq', label: 'FAQ' },
];

/**
 * Same top nav as the landing page, for secondary pages (Privacy Policy,
 * Terms of Service, etc.) that aren't the landing page itself — section
 * links navigate back to the landing page's anchors.
 */
export default function SiteHeader() {
    const homeUrl = home().url;

    return (
        <header className="sticky top-0 z-40 border-b border-(--color-ink)/8 bg-(--color-bg)/90 shadow-sm backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
                <Link href={home()}>
                    <HunianLogo className="h-7 w-auto" />
                </Link>
                <nav className="hidden items-center gap-8 md:flex">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.hash}
                            href={`${homeUrl}${link.hash}`}
                            className="text-sm font-medium text-(--color-ink)/75 transition hover:text-(--color-ink)"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>
                <div className="flex items-center gap-3">
                    <Link
                        href={login()}
                        className="text-sm font-medium text-(--color-ink)/75 transition hover:text-(--color-ink)"
                    >
                        Masuk
                    </Link>
                    <a
                        href={`${homeUrl}#daftar`}
                        className="shadow-elevated rounded-full bg-(--color-ink) px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        Daftar Sekarang
                    </a>
                </div>
            </div>
        </header>
    );
}
