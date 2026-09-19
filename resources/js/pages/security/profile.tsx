import { Head, router, usePage } from '@inertiajs/react';
import {
    Bell,
    Building2,
    Check,
    ChevronRight,
    HelpCircle,
    KeyRound,
    Loader2,
    LogOut,
    MapPin,
    Phone,
    ShieldCheck,
    SquarePen,
} from 'lucide-react';
import { useState } from 'react';
import SecurityBottomNav from '@/components/security/bottom-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { postJson } from '@/lib/api';
import { logout } from '@/routes';
import type { Membership } from '@/types';

type Guard = {
    name: string;
    phone: string;
    roleLabel: string;
    areaLabel: string;
    joinedAt: string;
};

type Props = {
    guard: Guard;
};

type MenuItem = {
    icon: typeof Bell;
    label: string;
    onClick?: () => void;
};

export default function SecurityProfile({ guard }: Props) {
    const { auth } = usePage().props;
    const [loggingOut, setLoggingOut] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [switchOpen, setSwitchOpen] = useState(false);

    function requestLogout() {
        setConfirmOpen(true);
    }

    function confirmLogout() {
        setLoggingOut(true);
        router.post(logout.url(), {}, { onFinish: () => setLoggingOut(false) });
    }

    // Distinct complexes this guard's "security" memberships belong to — a
    // guard covering more than one complex switches between them here, same
    // idea as the admin/resident switcher, minus the role picker (a security
    // membership is always the "security" role).
    const securityMemberships = auth.memberships.filter((m) => m.roleKey === 'security');
    const complexes = Array.from(
        new Map(securityMemberships.map((m) => [m.areaId, m])).values(),
    );

    const menuItems: MenuItem[] = [
        ...(complexes.length > 1
            ? [{ icon: Building2, label: 'Ganti Kompleks', onClick: () => setSwitchOpen(true) }]
            : []),
        { icon: KeyRound, label: 'Ubah kata sandi', onClick: () => setPasswordOpen(true) },
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
                    <div className="flex items-center gap-1.5 text-center">
                        <p className="text-base font-semibold text-(--color-ink)">
                            {guard.name}
                        </p>
                        <button
                            type="button"
                            onClick={() => setEditOpen(true)}
                            aria-label="Ubah nama"
                            className="flex h-6 w-6 items-center justify-center rounded-full text-(--color-ink)/40 hover:bg-(--color-ink)/5"
                        >
                            <SquarePen className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <p className="text-sm text-(--color-ink)/50">
                        {guard.roleLabel}
                    </p>
                </div>

                {/* Info card */}
                <div className="mx-5 space-y-3 rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-4">
                    <InfoRow
                        icon={Phone}
                        label="No. HP"
                        value={guard.phone}
                    />
                    <InfoRow
                        icon={MapPin}
                        label="Area"
                        value={guard.areaLabel}
                    />
                </div>

                <p className="px-5 pt-3 text-center text-xs text-(--color-ink)/40">
                    Bergabung sejak {guard.joinedAt}
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

            {editOpen && (
                <EditNameSheet
                    initialName={guard.name}
                    onClose={() => setEditOpen(false)}
                />
            )}

            {passwordOpen && (
                <ChangePasswordSheet onClose={() => setPasswordOpen(false)} />
            )}

            {switchOpen && (
                <SwitchComplexSheet
                    complexes={complexes}
                    currentMembershipId={auth.currentMembershipId}
                    onClose={() => setSwitchOpen(false)}
                />
            )}
        </>
    );
}

function EditNameSheet({
    initialName,
    onClose,
}: {
    initialName: string;
    onClose: () => void;
}) {
    const [name, setName] = useState(initialName);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    function submit() {
        setSubmitting(true);
        setErrors({});

        router.patch(
            '/security/profile',
            { name },
            {
                onSuccess: () => onClose(),
                onError: (e) => setErrors(e as Record<string, string>),
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <p className="mb-4 text-center text-base font-semibold text-(--color-ink)">
                    Ubah Nama
                </p>

                <div className="grid gap-2">
                    <Input
                        autoFocus
                        className="h-12 text-base"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="mt-5 flex gap-2">
                    <Button
                        variant="outline"
                        className="h-12 flex-1"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Batal
                    </Button>
                    <Button
                        className="h-12 flex-1"
                        onClick={submit}
                        disabled={!name.trim() || submitting}
                    >
                        {submitting && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Simpan
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    function submit() {
        setSubmitting(true);
        setErrors({});

        router.put(
            '/security/profile/password',
            {
                current_password: currentPassword,
                password,
                password_confirmation: passwordConfirmation,
            },
            {
                onSuccess: () => onClose(),
                onError: (e) => setErrors(e as Record<string, string>),
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <p className="mb-4 text-center text-base font-semibold text-(--color-ink)">
                    Ubah Kata Sandi
                </p>

                <div className="grid gap-3">
                    <div className="grid gap-1.5">
                        <PasswordInput
                            placeholder="Kata sandi saat ini"
                            className="h-12 text-base"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <InputError message={errors.current_password} />
                    </div>
                    <div className="grid gap-1.5">
                        <PasswordInput
                            placeholder="Kata sandi baru"
                            className="h-12 text-base"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <InputError message={errors.password} />
                    </div>
                    <div className="grid gap-1.5">
                        <PasswordInput
                            placeholder="Konfirmasi kata sandi baru"
                            className="h-12 text-base"
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-5 flex gap-2">
                    <Button
                        variant="outline"
                        className="h-12 flex-1"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Batal
                    </Button>
                    <Button
                        className="h-12 flex-1"
                        onClick={submit}
                        disabled={!currentPassword || !password || !passwordConfirmation || submitting}
                    >
                        {submitting && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Simpan
                    </Button>
                </div>
            </div>
        </div>
    );
}

function SwitchComplexSheet({
    complexes,
    currentMembershipId,
    onClose,
}: {
    complexes: Membership[];
    currentMembershipId: number | null;
    onClose: () => void;
}) {
    const [switching, setSwitching] = useState<number | null>(null);

    function switchTo(membershipId: number) {
        if (membershipId === currentMembershipId || switching !== null) {
            return;
        }

        setSwitching(membershipId);

        // Hard redirect, not an Inertia visit — the whole point is that the
        // session's active area changes, so a stale prefetch-cached response
        // for the complex just switched away from must not be served.
        postJson<{ redirect: string }>('/switch-membership', {
            membership_id: membershipId,
        })
            .then((data) => {
                window.location.href = data.redirect;
            })
            .catch(() => setSwitching(null));
    }

    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <p className="mb-4 text-center text-base font-semibold text-(--color-ink)">
                    Ganti Kompleks
                </p>

                <div className="space-y-1.5">
                    {complexes.map((complex) => {
                        const isActive = complex.id === currentMembershipId;

                        return (
                            <button
                                key={complex.id}
                                type="button"
                                disabled={switching !== null}
                                onClick={() => switchTo(complex.id)}
                                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition ${
                                    isActive
                                        ? 'bg-(--color-mint)/10'
                                        : 'hover:bg-(--color-ink)/5'
                                }`}
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-ink)/5">
                                    <Building2 className="h-4 w-4 text-(--color-ink)/60" />
                                </div>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-(--color-ink)">
                                        {complex.complexName}
                                    </span>
                                    <span className="block truncate text-xs text-(--color-ink)/45">
                                        {complex.areaName}
                                    </span>
                                </span>
                                {switching === complex.id ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-(--color-ink)/40" />
                                ) : isActive ? (
                                    <Check className="h-4 w-4 shrink-0 text-(--color-mint-deep)" />
                                ) : null}
                            </button>
                        );
                    })}
                </div>

                <Button
                    variant="outline"
                    className="mt-5 h-12 w-full"
                    onClick={onClose}
                    disabled={switching !== null}
                >
                    Batal
                </Button>
            </div>
        </div>
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
