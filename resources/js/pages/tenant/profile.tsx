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
} from 'lucide-react';
import { useState } from 'react';
import PageHeader from '@/components/shared/page-header';
import TenantBottomNav from '@/components/tenant/bottom-nav';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { postJson } from '@/lib/api';
import { logout } from '@/routes';
import type { Membership } from '@/types';

type Props = {
    resident: {
        name: string;
        unit: string | null;
        phone: string | null;
    };
};

export default function TenantProfile({ resident }: Props) {
    const { auth } = usePage().props;
    const [loggingOut, setLoggingOut] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [switchOpen, setSwitchOpen] = useState(false);
    const push = usePushNotifications();

    // Every area this resident is an active member of — a person can be
    // registered in more than one area (different unit/complex), so they
    // switch between them here, same idea as the security guard's "Ganti
    // Kompleks" switcher.
    const residentMemberships = auth.memberships.filter((m) => m.roleKey === 'resident');

    function confirmLogout() {
        setLoggingOut(true);
        router.post(logout.url(), {}, { onFinish: () => setLoggingOut(false) });
    }

    function togglePush() {
        if (push.status === 'subscribed') {
            push.unsubscribe();

            return;
        }

        push.subscribe();
    }

    return (
        <>
            <Head title="Profil" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-surface) pb-[env(safe-area-inset-bottom)]">
                <PageHeader title="Profil" tone="tenant" />

                <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-(--color-sky)/15 text-(--color-sky-deep)">
                        <Building2 className="h-9 w-9" />
                    </div>
                    <div className="text-center">
                        <p className="text-base font-semibold text-(--color-ink)">
                            {resident.name}
                        </p>
                        <p className="text-sm text-(--color-ink)/50">
                            {[resident.unit, resident.phone].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                </div>

                <div className="mx-5 overflow-hidden rounded-2xl border border-(--color-ink)/8">
                    {residentMemberships.length > 1 && (
                        <button
                            type="button"
                            onClick={() => setSwitchOpen(true)}
                            className="flex w-full items-center gap-3 border-b border-(--color-ink)/6 px-4 py-3.5 text-left"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-ink)/5">
                                <MapPin className="h-4 w-4 text-(--color-ink)/60" />
                            </div>
                            <span className="flex-1 text-sm font-medium text-(--color-ink)">
                                Ganti Area
                            </span>
                            <ChevronRight className="h-4 w-4 text-(--color-ink)/30" />
                        </button>
                    )}

                    <button
                        type="button"
                        className="flex w-full items-center gap-3 border-b border-(--color-ink)/6 px-4 py-3.5 text-left"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-ink)/5">
                            <KeyRound className="h-4 w-4 text-(--color-ink)/60" />
                        </div>
                        <span className="flex-1 text-sm font-medium text-(--color-ink)">
                            Ubah kata sandi
                        </span>
                        <ChevronRight className="h-4 w-4 text-(--color-ink)/30" />
                    </button>

                    <div className="flex w-full items-center gap-3 border-b border-(--color-ink)/6 px-4 py-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-ink)/5">
                            <Bell className="h-4 w-4 text-(--color-ink)/60" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-(--color-ink)">
                                Notifikasi Push
                            </p>
                            <p className="text-xs text-(--color-ink)/40">
                                {push.status === 'subscribed'
                                    ? 'Aktif'
                                    : push.status === 'denied'
                                      ? 'Diblokir browser'
                                      : 'Nonaktif'}
                            </p>
                        </div>

                        <PushToggle
                            enabled={push.status === 'subscribed'}
                            loading={push.loading}
                            disabled={
                                push.status === 'denied' ||
                                push.status === 'unsupported'
                            }
                            onToggle={togglePush}
                        />
                    </div>

                    <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-ink)/5">
                            <HelpCircle className="h-4 w-4 text-(--color-ink)/60" />
                        </div>
                        <span className="flex-1 text-sm font-medium text-(--color-ink)">
                            Bantuan
                        </span>
                        <ChevronRight className="h-4 w-4 text-(--color-ink)/30" />
                    </button>
                </div>

                <div className="flex-1" />

                <div className="px-5 pt-6 pb-28">
                    <button
                        type="button"
                        onClick={() => setConfirmOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-600"
                    >
                        <LogOut className="h-4 w-4" />
                        Keluar
                    </button>
                </div>

                <TenantBottomNav active="profile" />
            </div>

            {confirmOpen && (
                <LogoutConfirm
                    loading={loggingOut}
                    onCancel={() => setConfirmOpen(false)}
                    onConfirm={confirmLogout}
                />
            )}

            {switchOpen && (
                <SwitchAreaSheet
                    areas={residentMemberships}
                    currentMembershipId={auth.currentMembershipId}
                    onClose={() => setSwitchOpen(false)}
                />
            )}
        </>
    );
}

function PushToggle({
    enabled,
    loading,
    disabled,
    onToggle,
}: {
    enabled: boolean;
    loading: boolean;
    disabled: boolean;
    onToggle: () => void;
}) {
    if (loading) {
        return (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-(--color-ink)/40" />
        );
    }

    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition disabled:opacity-40 ${
                enabled ? 'bg-(--color-sky-deep)' : 'bg-(--color-ink)/15'
            }`}
        >
            <span
                className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    );
}

function SwitchAreaSheet({
    areas,
    currentMembershipId,
    onClose,
}: {
    areas: Membership[];
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
        // for the area just switched away from must not be served.
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
                    Ganti Area
                </p>

                <div className="space-y-1.5">
                    {areas.map((area) => {
                        const isActive = area.id === currentMembershipId;

                        return (
                            <button
                                key={area.id}
                                type="button"
                                disabled={switching !== null}
                                onClick={() => switchTo(area.id)}
                                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition ${
                                    isActive
                                        ? 'bg-(--color-sky)/10'
                                        : 'hover:bg-(--color-ink)/5'
                                }`}
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-ink)/5">
                                    <Building2 className="h-4 w-4 text-(--color-ink)/60" />
                                </div>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-(--color-ink)">
                                        {area.complexName}
                                    </span>
                                    <span className="block truncate text-xs text-(--color-ink)/45">
                                        {area.areaName}
                                    </span>
                                </span>
                                {switching === area.id ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-(--color-ink)/40" />
                                ) : isActive ? (
                                    <Check className="h-4 w-4 shrink-0 text-(--color-sky-deep)" />
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
                    Anda perlu masuk kembali untuk mengakses aplikasi.
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

TenantProfile.layout = (page: React.ReactNode) => page;
