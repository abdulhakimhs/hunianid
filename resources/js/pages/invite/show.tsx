import { Head, useForm } from '@inertiajs/react';
import { AlertTriangle, Loader2, Sparkles, Users } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
    valid: boolean;
    code?: string;
    complexName?: string;
    areaName?: string | null;
    isUnclaimed?: boolean;
};

export default function InviteShow({ valid, code, complexName, areaName, isUnclaimed }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        unit_number: '',
        block: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(`/invite/${code}/submit`);
    }

    if (!valid) {
        return (
            <>
                <Head title="Undangan tidak valid" />
                <div className="flex flex-col items-center py-2 text-center">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-coral)]/12 text-[color:var(--color-coral)]">
                        <AlertTriangle className="h-6 w-6" />
                    </span>
                    <h1 className="mt-4 font-display text-lg font-semibold text-[color:var(--color-ink)]">Tautan undangan tidak valid</h1>
                    <p className="mt-1 max-w-sm text-sm leading-relaxed text-[color:var(--color-ink)]/60">
                        Tautan ini sudah kedaluwarsa atau tidak berlaku lagi. Hubungi pengurus Anda untuk mendapatkan tautan baru.
                    </p>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`Gabung ${complexName}`} />
            <div className="mb-6 space-y-2">
                {areaName ? (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[color:var(--color-mint)]/25 bg-[color:var(--color-mint)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--color-mint-deep)]">
                        <Users className="h-3.5 w-3.5" />
                        {areaName}
                    </span>
                ) : (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--color-sky-deep)]">
                        <Sparkles className="h-3.5 w-3.5" />
                        Belum ada pengurus
                    </span>
                )}
                <h1 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">Gabung {complexName}</h1>
                <p className="text-sm leading-relaxed text-[color:var(--color-ink)]/55">
                    {isUnclaimed
                        ? 'Belum ada pengurus di sini — jadilah salah satu warga pertama yang terdaftar.'
                        : 'Lengkapi data di bawah untuk mendaftar.'}
                </p>
            </div>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">Nama lengkap</Label>
                    <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
                    <InputError message={errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                    <InputError message={errors.email} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="phone">No. HP</Label>
                    <Input id="phone" type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                    <InputError message={errors.phone} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password">Kata sandi</Label>
                    <PasswordInput id="password" value={data.password} onChange={(e) => setData('password', e.target.value)} />
                    <InputError message={errors.password} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                        <Label htmlFor="block">Blok (opsional)</Label>
                        <Input id="block" value={data.block} onChange={(e) => setData('block', e.target.value)} placeholder="Blok A" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="unit_number">No. rumah/unit</Label>
                        <Input id="unit_number" value={data.unit_number} onChange={(e) => setData('unit_number', e.target.value)} placeholder="No. 12" />
                        <InputError message={errors.unit_number} />
                    </div>
                </div>

                <Button type="submit" className="mt-2 w-full" disabled={processing}>
                    {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Daftar
                </Button>
            </form>
        </>
    );
}
