import { Head } from '@inertiajs/react';
import {
    Bell,
    ChevronRight,
    HelpCircle,
    KeyRound,
    Loader2,
    LogOut,
    MapPin,
    Phone,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import SecurityBottomNav from '@/components/security/bottom-nav';
import { Button } from '@/components/ui/button';

// Dummy data — swap for real props from GET /security/profile once the
// backend endpoint exists.

const dummyGuard = {
    name: 'Budi Santoso',
    role: 'Petugas Keamanan',
    phone: '0812-3456-7890',
    post: 'Pos Gerbang Utama',
    shift: 'Shift Pagi (06:00 – 14:00)',
    joinedAt: 'Bergabung sejak Jan 2025',
};

type MenuItem = {
    icon: typeof Bell;
    label: string;
    onClick?: () => void;
};

export default function SecurityProfile() {
    const [loggingOut, setLoggingOut] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    function requestLogout() {
        setConfirmOpen(true);
    }

    function confirmLogout() {
        setLoggingOut(true);

        // Dummy delay — swap for a real POST /logout call once wired up.
        setTimeout(() => {
            window.location.href = '/login-security';
        }, 600);
    }

    const menuItems: MenuItem[] = [
        { icon: KeyRound, label: 'Ubah kata sandi' },
        { icon: Bell, label: 'Notifikasi' },
        { icon: HelpCircle, label: 'Bantuan' },
    ];

    return (
        <>
            <Head title="Profil" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-surface) pt-[env(safe-area-inset-top)]">
                {/* Header */}
                <div className="flex flex-col items-center gap-3 px-5 pt-8 pb-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-(--color-mint)/15 text-(--color-mint-deep)">
                        <ShieldCheck className="h-9 w-9" />
                    </div>
                    <div className="text-center">
                        <p className="text-base font-semibold text-(--color-ink)">
                            {dummyGuard.name}
                        </p>
                        <p className="text-sm text-(--color-ink)/50">
                            {dummyGuard.role}
                        </p>
                    </div>
                </div>

                {/* Info card */}
                <div className="mx-5 space-y-3 rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-4">
                    <InfoRow
                        icon={Phone}
                        label="No. HP"
                        value={dummyGuard.phone}
                    />
                    <InfoRow
                        icon={MapPin}
                        label="Lokasi pos"
                        value={dummyGuard.post}
                    />
                    <InfoRow
                        icon={ShieldCheck}
                        label="Shift"
                        value={dummyGuard.shift}
                    />
                </div>

                <p className="px-5 pt-3 text-center text-xs text-(--color-ink)/40">
                    {dummyGuard.joinedAt}
                </p>

                {/* Menu */}
                <div className="mx-5 mt-6 overflow-hidden rounded-2xl border border-(--color-ink)/8">
                    {menuItems.map((item, index) => {
                        const Icon = item.icon;
                        const isLast = index === menuItems.length - 1;

                        return (
                            <button
                                key={item.label}
                                type="button"
                                onClick={item.onClick}
                                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
                                    isLast
                                        ? ''
                                        : 'border-b border-(--color-ink)/6'
                                }`}
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-ink)/5">
                                    <Icon className="h-4 w-4 text-(--color-ink)/60" />
                                </div>
                                <span className="flex-1 text-sm font-medium text-(--color-ink)">
                                    {item.label}
                                </span>
                                <ChevronRight className="h-4 w-4 text-(--color-ink)/30" />
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1" />

                {/* Logout */}
                <div className="px-5 pb-28">
                    <button
                        type="button"
                        onClick={requestLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-600"
                    >
                        <LogOut className="h-4 w-4" />
                        Keluar
                    </button>
                </div>

                <SecurityBottomNav active="profile" />
            </div>

            {confirmOpen && (
                <LogoutConfirm
                    loading={loggingOut}
                    onCancel={() => setConfirmOpen(false)}
                    onConfirm={confirmLogout}
                />
            )}
        </>
    );
}

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Phone;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-ink)/5">
                <Icon className="h-4 w-4 text-(--color-ink)/50" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] text-(--color-ink)/45">{label}</p>
                <p className="truncate text-sm font-medium text-(--color-ink)">
                    {value}
                </p>
            </div>
        </div>
    );
}

function LogoutConfirm({
    loading,
    onCancel,
    onConfirm,
}: {
    loading: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <p className="text-center text-base font-semibold text-(--color-ink)">
                    Keluar dari akun?
                </p>
                <p className="mt-1 text-center text-sm text-(--color-ink)/50">
                    Anda perlu memasukkan No. HP dan kata sandi kembali untuk
                    masuk.
                </p>

                <div className="mt-5 flex gap-2">
                    <Button
                        variant="outline"
                        className="h-12 flex-1"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Batal
                    </Button>
                    <Button
                        className="h-12 flex-1 bg-red-600 hover:bg-red-600/90"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Keluar
                    </Button>
                </div>
            </div>
        </div>
    );
}

SecurityProfile.layout = (page: React.ReactNode) => page;
