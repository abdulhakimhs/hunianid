import { Head, router } from '@inertiajs/react';
import {
    Check,
    Copy,
    Link2,
    Loader2,
    MessageCircle,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Invite = { id: number; code: string; status: string } | null;

type Props = {
    invite: Invite;
    areaName: string;
    frame?: 'pengelola' | 'resident' | null;
};

export default function InvitesIndex({ invite, areaName, frame }: Props) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);

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

        const text = encodeURIComponent(
            isPengelolaFrame
                ? `Halo! Saya ingin mengajak Anda menjadi pengurus di ${areaName}. Daftar lewat tautan ini ya: ${link}`
                : `Halo! Yuk gabung sebagai warga terdaftar di ${areaName}. Daftar lewat tautan ini ya: ${link}`,
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
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
                <p className="max-w-xl text-sm leading-relaxed text-[color:var(--color-ink)]/60">
                    Bagikan satu tautan, siapa pun yang membukanya bisa langsung mendaftar dan masuk ke antrean persetujuan Anda.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
                <section className="relative overflow-hidden rounded-[2rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-6 shadow-elevated lg:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_color-mix(in_srgb,_var(--color-mint)_14%,_transparent),_transparent_45%),radial-gradient(circle_at_bottom_right,_color-mix(in_srgb,_var(--color-sky)_14%,_transparent),_transparent_40%)]" />

                    <div className="relative">
                        {invite ? (
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                                                isPengelolaFrame
                                                    ? 'bg-[color:var(--color-mint)]/12 text-[color:var(--color-mint-deep)]'
                                                    : 'bg-[color:var(--color-sky)]/12 text-[color:var(--color-sky-deep)]'
                                            }`}
                                        >
                                            {isPengelolaFrame ? <ShieldCheck className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                                        </span>
                                        <div>
                                            <p className="font-display text-lg font-semibold text-[color:var(--color-ink)]">
                                                Tautan undangan aktif
                                            </p>
                                            <p className="text-sm text-[color:var(--color-ink)]/55">
                                                {isPengelolaFrame ? 'Untuk mengajak calon pengurus' : 'Untuk mengajak warga baru'}
                                            </p>
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
                                <span
                                    className={`inline-flex h-16 w-16 items-center justify-center rounded-full ${
                                        isPengelolaFrame
                                            ? 'bg-[color:var(--color-mint)]/12 text-[color:var(--color-mint-deep)]'
                                            : 'bg-[color:var(--color-sky)]/12 text-[color:var(--color-sky-deep)]'
                                    }`}
                                >
                                    {isPengelolaFrame ? <ShieldCheck className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
                                </span>
                                <p className="mt-4 font-display text-lg font-semibold text-[color:var(--color-ink)]">
                                    Belum ada undangan aktif
                                </p>
                                <p className="mt-1 max-w-sm text-sm leading-relaxed text-[color:var(--color-ink)]/55">
                                    {isPengelolaFrame
                                        ? 'Buat tautan untuk mengajak calon pengurus bergabung sebagai admin di area Anda.'
                                        : 'Buat tautan sekali, lalu bagikan ke warga lewat WhatsApp atau grup manapun.'}
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
                                { icon: Link2, text: 'Bagikan satu tautan ke siapa pun yang ingin bergabung.' },
                                { icon: Users, text: 'Mereka isi data dan unit rumah, lalu masuk ke antrean persetujuan.' },
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

                    {isPengelolaFrame && (
                        <div className="rounded-[1.5rem] border border-[color:var(--color-mint)]/20 bg-[color:var(--color-mint)]/8 p-5">
                            <p className="text-sm leading-relaxed text-[color:var(--color-ink)]">
                                Setelah calon pengurus bergabung, Anda bisa menyerahkan akses pengelola ke akun mereka dari halaman
                                Anggota kapan saja.
                            </p>
                        </div>
                    )}
                </aside>
            </div>

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
        </div>
    );
}
