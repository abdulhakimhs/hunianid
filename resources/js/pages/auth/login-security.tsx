import { Head } from '@inertiajs/react';
import { KeyRound, Loader2, ShieldCheck, SmartphoneNfc } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiValidationError, postJson } from '@/lib/api';

// Simplified, phone-first login for staff (security) and, later, tenants.
// No email/Google/passkey/register — those stay on the admin login page.
// Backend routes below (/staff/login/*) are placeholders — align the
// paths + response shape with whoever builds the controllers.

type Method = 'password' | 'otp';
type Phase = 'phone' | 'credential' | 'code';

export default function StaffLogin() {
    const [method, setMethod] = useState<Method>('password');
    const [phase, setPhase] = useState<Phase>('phone');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [devCode, setDevCode] = useState<string | null>(null);

    function continueFromPhone() {
        if (!phone) {
            return;
        }

        setErrors({});

        if (method === 'password') {
            setPhase('credential');
        } else {
            requestCode();
        }
    }

    function requestCode() {
        setErrors({});
        setLoading(true);

        postJson<{ dev_code?: string }>(
            '/staff/login/otp/request',
            { phone },
            { showOverlay: false },
        )
            .then((data) => {
                setDevCode(data.dev_code ?? null);
                setPhase('code');
            })
            .catch((err) => {
                if (err instanceof ApiValidationError) {
                    setErrors(err.errors);
                } else {
                    setErrors({ phone: 'Gagal mengirim kode. Coba lagi.' });
                }
            })
            .finally(() => setLoading(false));
    }

    function submitPassword() {
        setErrors({});
        setLoading(true);

        postJson<{ redirect: string }>(
            '/staff/login/password',
            { phone, password },
            { showOverlay: false },
        )
            .then((data) => {
                window.location.href = data.redirect;
            })
            .catch((err) => {
                if (err instanceof ApiValidationError) {
                    setErrors(err.errors);
                } else {
                    setErrors({ password: 'Nomor HP atau kata sandi salah.' });
                }
            })
            .finally(() => setLoading(false));
    }

    function verifyCode() {
        setErrors({});
        setLoading(true);

        postJson<{ redirect: string }>(
            '/staff/login/otp/verify',
            { phone, code },
            { showOverlay: false },
        )
            .then((data) => {
                window.location.href = data.redirect;
            })
            .catch((err) => {
                if (err instanceof ApiValidationError) {
                    setErrors(err.errors);
                } else {
                    setErrors({ code: 'Kode salah atau sudah kedaluwarsa.' });
                }
            })
            .finally(() => setLoading(false));
    }

    function backToPhone() {
        setPhase('phone');
        setPassword('');
        setCode('');
        setErrors({});
    }

    return (
        <>
            <Head title="Masuk" />

            <div className="mx-auto flex w-full max-w-sm flex-col gap-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-mint)]/15 text-[color:var(--color-mint-deep)]">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h1 className="text-lg font-semibold text-[color:var(--color-ink)]">
                        Masuk
                    </h1>
                    <p className="text-sm text-[color:var(--color-ink)]/55">
                        Gunakan nomor HP terdaftar untuk masuk
                    </p>
                </div>

                {phase === 'phone' && (
                    <div className="flex flex-col gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="phone">No. HP</Label>
                            <Input
                                id="phone"
                                type="tel"
                                inputMode="tel"
                                autoFocus
                                placeholder="08xxxxxxxxxx"
                                className="h-12 text-base"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && continueFromPhone()
                                }
                            />
                            <InputError message={errors.phone} />
                        </div>

                        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[color:var(--color-ink)]/5 p-1">
                            <button
                                type="button"
                                onClick={() => setMethod('password')}
                                className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition ${
                                    method === 'password'
                                        ? 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-sm'
                                        : 'text-[color:var(--color-ink)]/55'
                                }`}
                            >
                                <KeyRound className="h-4 w-4" />
                                Kata sandi
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('otp')}
                                className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition ${
                                    method === 'otp'
                                        ? 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-sm'
                                        : 'text-[color:var(--color-ink)]/55'
                                }`}
                            >
                                <SmartphoneNfc className="h-4 w-4" />
                                Kode OTP
                            </button>
                        </div>

                        <Button
                            type="button"
                            className="h-12 w-full text-base"
                            disabled={!phone || loading}
                            onClick={continueFromPhone}
                        >
                            {loading && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Lanjutkan
                        </Button>
                    </div>
                )}

                {phase === 'credential' && (
                    <div className="flex flex-col gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="password">Kata sandi</Label>
                            <PasswordInput
                                id="password"
                                autoFocus
                                className="h-12 text-base"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && submitPassword()
                                }
                            />
                            <InputError message={errors.password} />
                        </div>

                        <Button
                            type="button"
                            className="h-12 w-full text-base"
                            disabled={!password || loading}
                            onClick={submitPassword}
                        >
                            {loading && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Masuk
                        </Button>

                        <BackButton onClick={backToPhone} />
                    </div>
                )}

                {phase === 'code' && (
                    <div className="flex flex-col gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="code">Kode OTP</Label>
                            <Input
                                id="code"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                autoFocus
                                placeholder="123456"
                                className="h-12 text-center text-lg tracking-[0.3em]"
                                value={code}
                                onChange={(e) =>
                                    setCode(e.target.value.replace(/\D/g, ''))
                                }
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && verifyCode()
                                }
                            />
                            <InputError message={errors.code} />
                            <p className="text-xs text-[color:var(--color-ink)]/45">
                                Kode dikirim ke {phone}. Berlaku 5 menit.
                            </p>
                        </div>

                        {devCode && (
                            <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/10 px-3 py-2 text-sm text-[color:var(--color-sky-deep)]">
                                <ShieldCheck className="h-4 w-4 shrink-0" />
                                Mode pengujian: kode Anda adalah{' '}
                                <span className="font-mono font-semibold">
                                    {devCode}
                                </span>
                            </div>
                        )}

                        <Button
                            type="button"
                            className="h-12 w-full text-base"
                            disabled={code.length !== 6 || loading}
                            onClick={verifyCode}
                        >
                            {loading && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Verifikasi &amp; Masuk
                        </Button>

                        <BackButton onClick={backToPhone} />
                    </div>
                )}
            </div>
        </>
    );
}

function BackButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="text-center text-sm text-[color:var(--color-ink)]/50 underline-offset-2 hover:underline"
        >
            Ganti nomor HP
        </button>
    );
}

StaffLogin.layout = {
    title: 'Masuk',
    description: 'Masukkan nomor HP untuk melanjutkan',
};
