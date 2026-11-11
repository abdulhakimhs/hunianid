import { Link } from '@inertiajs/react';
import { ChevronRight, Home, ShieldCheck, UserCircle, Users } from 'lucide-react';

// Mirrors App\Services\ResidentGuidanceService — what a resident still has to
// resolve before their account is fully usable. null = nothing pending.
export type ResidentGuidance =
    | { type: 'complete_profile' }
    | {
          type: 'penghuni_unclaimed' | 'penghuni_unclaimed_and_pending_unit' | 'penghuni_pending_unit';
          areaId: number;
          areaName: string;
      }
    | null;

export default function ResidentGuidanceCard({ guidance }: { guidance: ResidentGuidance }) {
    if (!guidance) {
        return null;
    }

    if (guidance.type === 'complete_profile') {
        return (
            <div className="rounded-2xl border border-(--color-sky)/25 bg-(--color-sky)/8 p-4">
                <div className="flex items-start gap-3">
                    <UserCircle className="mt-0.5 h-5 w-5 shrink-0 text-(--color-sky-deep)" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-(--color-ink)">Lengkapi profil Anda</p>
                        <p className="mt-1 text-xs text-(--color-ink)/60">
                            Nama dan email Anda belum diisi. Lengkapi data ini supaya akun Anda mudah dikenali oleh pengurus
                            dan warga lain.
                        </p>
                        <Link
                            href="/settings/profile"
                            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-(--color-sky-deep) px-4 py-2 text-xs font-semibold text-white"
                        >
                            Lengkapi profil
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const showUnclaimed =
        guidance.type === 'penghuni_unclaimed' || guidance.type === 'penghuni_unclaimed_and_pending_unit';
    const showPendingUnit =
        guidance.type === 'penghuni_pending_unit' || guidance.type === 'penghuni_unclaimed_and_pending_unit';

    return (
        <div className="space-y-3">
            {showPendingUnit && (
                <div className="flex items-start gap-3 rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-4">
                    <Home className="mt-0.5 h-5 w-5 shrink-0 text-(--color-sky-deep)" />
                    <p className="text-sm text-(--color-ink)/80">
                        Menunggu konfirmasi dari penghuni yang sudah terdaftar di rumah ini sebelum akses Anda aktif.
                    </p>
                </div>
            )}

            {showUnclaimed && (
                <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-4">
                    <p className="text-[11px] font-semibold tracking-wide text-(--color-sky-deep) uppercase">
                        Belum ada pengurus di {guidance.areaName}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-(--color-ink)">Ajak orang lain bergabung</p>

                    <div className="mt-3 space-y-2">
                        <GuidanceLink
                            href="/admin/invites?frame=pengelola"
                            icon={ShieldCheck}
                            title="Ajak RT/Pengelola Bergabung"
                            description="Setelah mereka bergabung, Anda bisa menyerahkan akses pengelola ke akun mereka."
                            highlight
                        />
                        <GuidanceLink
                            href="/admin/invites?frame=resident"
                            icon={Users}
                            title="Ajak Warga Lain Bergabung"
                            description="Undang tetangga Anda untuk ikut terdaftar di sini."
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function GuidanceLink({
    href,
    icon: Icon,
    title,
    description,
    highlight = false,
}: {
    href: string;
    icon: typeof Users;
    title: string;
    description: string;
    highlight?: boolean;
}) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
                highlight ? 'border-(--color-mint) bg-(--color-mint)/10' : 'border-(--color-ink)/8 bg-(--color-bg)/70'
            }`}
        >
            <Icon className={`h-5 w-5 shrink-0 ${highlight ? 'text-(--color-mint-deep)' : 'text-(--color-sky-deep)'}`} />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-(--color-ink)">{title}</p>
                <p className="text-xs text-(--color-ink)/60">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-(--color-ink)/30" />
        </Link>
    );
}
