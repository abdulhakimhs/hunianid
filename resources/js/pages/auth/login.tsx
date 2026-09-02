import { Form, Head } from '@inertiajs/react';
import { Loader2, Phone, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { GoogleIcon } from '@/components/google-icon';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiValidationError, postJson } from '@/lib/api';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

type Tab = 'email' | 'phone';

export default function Login({ status, canResetPassword }: Props) {
    const [tab, setTab] = useState<Tab>('email');

    return (
        <>
            <Head title="Masuk" />

            <PasskeyVerify />

            {status && (
                <div className="mb-4 rounded-xl border border-[color:var(--color-mint)]/25 bg-[color:var(--color-mint)]/10 px-3 py-2 text-sm text-[color:var(--color-mint-deep)]">
                    {status}
                </div>
            )}

            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-[color:var(--color-ink)]/5 p-1">
                <button
                    type="button"
                    onClick={() => setTab('email')}
                    className={`rounded-lg py-1.5 text-sm font-medium transition ${
                        tab === 'email' ? 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-sm' : 'text-[color:var(--color-ink)]/55'
                    }`}
                >
                    Email
                </button>
                <button
                    type="button"
                    onClick={() => setTab('phone')}
                    className={`rounded-lg py-1.5 text-sm font-medium transition ${
                        tab === 'phone' ? 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-sm' : 'text-[color:var(--color-ink)]/55'
                    }`}
                >
                    No. HP
                </button>
            </div>

            {tab === 'email' ? (
                <Form
                    {...store.form()}
                    resetOnSuccess={['password']}
                    className="flex flex-col gap-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="email@example.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex items-center">
                                        <Label htmlFor="password">Kata sandi</Label>
                                        {canResetPassword && (
                                            <TextLink
                                                href={request()}
                                                className="ml-auto text-sm"
                                                tabIndex={5}
                                            >
                                                Lupa kata sandi?
                                            </TextLink>
                                        )}
                                    </div>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="Kata sandi"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="remember"
                                        name="remember"
                                        tabIndex={3}
                                    />
                                    <Label htmlFor="remember">Ingat saya</Label>
                                </div>

                                <Button
                                    type="submit"
                                    className="mt-4 w-full"
                                    tabIndex={4}
                                    disabled={processing}
                                    data-test="login-button"
                                >
                                    {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Masuk
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            ) : (
                <PhoneOtpForm />
            )}

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[color:var(--color-ink)]/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[color:var(--color-surface)] px-2 text-[color:var(--color-ink)]/40">atau lanjutkan dengan</span>
                </div>
            </div>

            <a href="/auth/google/redirect" className="block">
                <Button type="button" variant="outline" className="w-full">
                    <GoogleIcon />
                    Masuk dengan Google
                </Button>
            </a>

            <div className="mt-6 text-center text-sm text-[color:var(--color-ink)]/55">
                Belum punya akun?{' '}
                <TextLink href={register()} tabIndex={5}>
                    Daftar
                </TextLink>
            </div>
        </>
    );
}

function PhoneOtpForm() {
    const [phase, setPhase] = useState<'phone' | 'code'>('phone');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [devCode, setDevCode] = useState<string | null>(null);

    function requestCode() {
        setErrors({});
        setSending(true);

        postJson<{ ok?: boolean; expires_in?: number; dev_code?: string; registered?: boolean; phone?: string }>(
            '/login/phone/request',
            { phone },
            { showOverlay: false },
        )
            .then((data) => {
                if (data.registered === false) {
                    // Not an error — hand off to the registration wizard, pre-filled
                    // with this phone number, instead of showing a dead end.
                    window.location.href = `/register?phone=${encodeURIComponent(data.phone ?? phone)}&quick=1`;

                    return;
                }

                setDevCode(data.dev_code ?? null);
                setPhase('code');
                setSending(false);
            })
            .catch((err) => {
                if (err instanceof ApiValidationError) {
                    setErrors(err.errors);
                } else {
                    setErrors({ phone: 'Gagal mengirim kode. Coba lagi.' });
                }

                setSending(false);
            });
    }

    function verifyCode() {
        setErrors({});
        setVerifying(true);

        postJson<{ redirect: string }>('/login/phone/verify', { phone, code }, { showOverlay: false })
            .then((data) => {
                window.location.href = data.redirect;
            })
            .catch((err) => {
                if (err instanceof ApiValidationError) {
                    setErrors(err.errors);
                } else {
                    setErrors({ code: 'Gagal memverifikasi kode. Coba lagi.' });
                }
                setVerifying(false);
            });
    }

    if (phase === 'phone') {
        return (
            <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="otp-phone">No. HP</Label>
                    <Input
                        id="otp-phone"
                        type="tel"
                        autoFocus
                        placeholder="08xxxxxxxxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && requestCode()}
                    />
                    <InputError message={errors.phone} />
                </div>

                <Button type="button" className="w-full" disabled={!phone || sending} onClick={requestCode}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                    Kirim kode OTP
                </Button>

                <p className="text-center text-xs text-[color:var(--color-ink)]/40">
                    Pengiriman kode via WhatsApp sedang dalam pengembangan.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-2">
                <Label htmlFor="otp-code">Kode OTP</Label>
                <Input
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                />
                <InputError message={errors.code} />
                <p className="text-xs text-[color:var(--color-ink)]/45">Kode dikirim ke {phone}. Berlaku 5 menit.</p>
            </div>

            {devCode && (
                <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/10 px-3 py-2 text-sm text-[color:var(--color-sky-deep)]">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    Mode pengujian: kode Anda adalah <span className="font-mono font-semibold">{devCode}</span>
                </div>
            )}

            <Button type="button" className="w-full" disabled={code.length !== 6 || verifying} onClick={verifyCode}>
                {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                Verifikasi &amp; Masuk
            </Button>

            <button
                type="button"
                onClick={() => {
                    setPhase('phone');
                    setCode('');
                    setErrors({});
                }}
                className="text-center text-sm text-[color:var(--color-ink)]/50 underline-offset-2 hover:underline"
            >
                Ganti nomor HP
            </button>
        </div>
    );
}

Login.layout = {
    title: 'Masuk ke akun Anda',
    description: 'Masukkan email dan kata sandi untuk melanjutkan',
};
