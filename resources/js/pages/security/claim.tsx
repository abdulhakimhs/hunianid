import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useInstallPrompt } from '@/hooks/use-install-prompt';

type Props = {
    valid: boolean;
    alreadyClaimed?: boolean;
    code?: string;
    name?: string;
    complexName?: string;
    areaName?: string;
    claimed?: boolean;
};

export default function SecurityClaim({
    valid,
    alreadyClaimed,
    code,
    name,
    complexName,
    claimed,
}: Props) {
    const { data, setData, post, processing, errors } = useForm({
        password: '',
        password_confirmation: '',
    });

    const { canInstall, installed, promptInstall } = useInstallPrompt();

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(`/security/claim/${code}`);
    }

    if (!valid) {
        return (
            <>
                <Head title="Tautan tidak valid" />
                <div className="flex flex-col items-center py-2 text-center">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-coral)]/12 text-[color:var(--color-coral)]">
                        <AlertTriangle className="h-6 w-6" />
                    </span>
                    <h1 className="mt-4 font-display text-lg font-semibold text-[color:var(--color-ink)]">
                        Tautan tidak valid
                    </h1>
                    <p className="mt-1 max-w-sm text-sm leading-relaxed text-[color:var(--color-ink)]/60">
                        {alreadyClaimed
                            ? 'Akun ini sudah aktif — silakan masuk lewat halaman login.'
                            : 'Tautan ini sudah kedaluwarsa atau tidak berlaku lagi. Hubungi pengurus Anda untuk mendapatkan tautan baru.'}
                    </p>
                    {alreadyClaimed && (
                        <Button asChild className="mt-5">
                            <Link href="/login">Masuk</Link>
                        </Button>
                    )}
                </div>
            </>
        );
    }

    if (claimed) {
        return (
            <>
                <Head title="Akun siap" />
                <div className="flex flex-col items-center py-2 text-center">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-(--color-mint)/12 text-(--color-mint-deep)">
                        <CheckCircle2 className="h-6 w-6" />
                    </span>
                    <h1 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">
                        Akun siap ✓
                    </h1>
                    <p className="mt-1 max-w-sm text-sm leading-relaxed text-(--color-ink)/60">
                        Akun Security Anda untuk {complexName} sudah aktif.
                        Pasang aplikasinya agar lebih mudah diakses.
                    </p>

                    <div className="mt-6 flex w-full flex-col gap-2">
                        {canInstall && !installed ? (
                            <Button onClick={() => promptInstall()} className="w-full">
                                <Smartphone className="h-4 w-4" />
                                Install Security App
                            </Button>
                        ) : (
                            <p className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-4 py-3 text-xs leading-relaxed text-(--color-ink)/55">
                                {installed
                                    ? 'Aplikasi sudah terpasang di perangkat ini.'
                                    : "Aplikasi belum bisa diinstal otomatis di browser ini. Buka menu browser Anda dan pilih \"Add to Home Screen\" / \"Install App\" secara manual."}
                            </p>
                        )}
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/security">Lanjut ke Dashboard</Link>
                        </Button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`Selamat datang, ${name}`} />
            <div className="mb-6 space-y-2">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-(--color-sky)/25 bg-(--color-sky)/10 px-2.5 py-1 text-xs font-semibold text-(--color-sky-deep)">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Akun Security
                </span>
                <h1 className="font-display text-lg font-semibold text-(--color-ink)">
                    Selamat datang, {name}.
                </h1>
                <p className="text-sm leading-relaxed text-(--color-ink)/55">
                    {complexName} telah membuat akun Security Anda. Buat kata
                    sandi untuk melanjutkan.
                </p>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="password">Kata sandi baru</Label>
                    <PasswordInput
                        id="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        autoFocus
                    />
                    <InputError message={errors.password} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password_confirmation">
                        Konfirmasi kata sandi
                    </Label>
                    <PasswordInput
                        id="password_confirmation"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                    />
                    <InputError message={errors.password_confirmation} />
                </div>

                <Button type="submit" className="mt-2 w-full" disabled={processing}>
                    {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Lanjutkan
                </Button>
            </form>
        </>
    );
}
