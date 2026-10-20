import { Head, Link, router } from '@inertiajs/react';
import { Clock, LogOut } from 'lucide-react';
import { useState } from 'react';
import HunianLogo from '@/components/hunian-logo';
import LogoutConfirm from '@/components/shared/logout-confirm';
import { Button } from '@/components/ui/button';
import { home, logout } from '@/routes';

type Props = {
    areaName: string | null;
};

export default function PendingApproval({ areaName }: Props) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    function confirmLogout() {
        setLoggingOut(true);
        router.post(logout.url(), {}, { onFinish: () => setLoggingOut(false) });
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-[color:var(--color-bg)] p-6">
            <Head title="Menunggu Persetujuan" />

            <div className="w-full max-w-md">
                <div className="flex flex-col gap-7">
                    <div className="flex flex-col items-center gap-3">
                        <Link href={home()}>
                            <HunianLogo />
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-6 shadow-elevated sm:p-7">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-coral)]/10 text-[color:var(--color-coral)]">
                                <Clock className="h-7 w-7" />
                            </span>

                            <div className="flex flex-col gap-1.5">
                                <h1 className="font-display text-xl font-bold tracking-tight text-[color:var(--color-ink)]">
                                    Menunggu Persetujuan
                                </h1>
                                <p className="text-sm leading-relaxed text-[color:var(--color-ink)]/60">
                                    Akun Anda{areaName ? ` sedang menunggu persetujuan dari pengurus ${areaName}` : ' sedang menunggu persetujuan dari pengurus'}.
                                    Anda akan bisa mengakses aplikasi setelah disetujui.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setConfirmOpen(true)}
                            >
                                <LogOut className="h-4 w-4" /> Keluar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {confirmOpen && (
                <LogoutConfirm
                    loading={loggingOut}
                    onCancel={() => setConfirmOpen(false)}
                    onConfirm={confirmLogout}
                />
            )}
        </div>
    );
}
