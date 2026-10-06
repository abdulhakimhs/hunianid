import { Head, Link } from '@inertiajs/react';
import { Building2, ChevronRight, Mail, Phone, User, Users } from 'lucide-react';
import PageHeader from '@/components/shared/page-header';
import TenantBottomNav from '@/components/tenant/bottom-nav';

type FamilyMember = {
    id: number;
    name: string;
    phone: string | null;
};

type Props = {
    unit: { number: string | null; area: string | null; type: string };
    resident: { name: string; phone: string | null; email: string };
    familyMembers: FamilyMember[];
    familyMembersTotal: number;
    management: { phone: string; email: string; hours: string };
};

export default function TenantUnit({ unit, resident, familyMembers, familyMembersTotal, management }: Props) {
    return (
        <>
            <Head title="Unit Saya" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-surface) pb-[env(safe-area-inset-bottom)]">
                <PageHeader title="Unit Saya" tone="tenant" />

                <div className="flex-1 space-y-5 overflow-y-auto px-5 pt-4 pb-28">
                    {/* Unit card */}
                    <div className="rounded-2xl bg-(--color-ink) p-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-lg font-bold">
                                    Unit {unit.number}
                                </p>
                                <p className="text-xs text-white/60">
                                    {unit.area}
                                </p>
                            </div>
                        </div>

                        <span className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium">
                            {unit.type}
                        </span>
                    </div>

                    {/* Resident info */}
                    <Section title="Informasi Penghuni" icon={User}>
                        <InfoRow
                            icon={User}
                            label="Nama"
                            value={resident.name}
                        />
                        <InfoRow
                            icon={Phone}
                            label="No. HP"
                            value={resident.phone ?? '-'}
                        />
                        <InfoRow
                            icon={Mail}
                            label="Email"
                            value={resident.email}
                        />
                    </Section>

                    {/* Family members */}
                    <Section title="Anggota Keluarga" icon={Users}>
                        {familyMembers.length === 0 ? (
                            <p className="text-sm text-(--color-ink)/40">
                                Belum ada anggota keluarga terdaftar.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {familyMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-3"
                                    >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-ink)/5">
                                            <Users className="h-4 w-4 text-(--color-ink)/50" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-(--color-ink)">
                                                {member.name}
                                            </p>
                                            <p className="truncate text-xs text-(--color-ink)/45">
                                                {member.phone ?? '—'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {familyMembersTotal > familyMembers.length && (
                                    <p className="text-xs text-(--color-ink)/40">
                                        +{familyMembersTotal - familyMembers.length} anggota lainnya
                                    </p>
                                )}
                            </div>
                        )}

                        <Link
                            href="/tenant/family"
                            className="mt-3 flex items-center justify-between rounded-xl bg-(--color-sky)/8 px-3 py-2.5 text-sm font-medium text-(--color-sky-deep)"
                        >
                            Kelola Keluarga
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </Section>

                    {/* Management contact */}
                    <Section title="Kontak Pengelola" icon={Phone}>
                        <a
                            href={`tel:${management.phone}`}
                            className="flex items-center gap-3"
                        >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-mint)/12 text-(--color-mint-deep)">
                                <Phone className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-(--color-ink)">
                                    {management.phone}
                                </p>
                                <p className="text-xs text-(--color-ink)/45">
                                    {management.hours}
                                </p>
                            </div>
                        </a>

                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-ink)/5">
                                <Mail className="h-4 w-4 text-(--color-ink)/50" />
                            </div>
                            <p className="truncate text-sm text-(--color-ink)/70">
                                {management.email}
                            </p>
                        </div>
                    </Section>
                </div>

                <TenantBottomNav active="unit" />
            </div>
        </>
    );
}

function Section({
    title,
    icon: Icon,
    children,
}: {
    title: string;
    icon: typeof User;
    children: React.ReactNode;
}) {
    return (
        <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-(--color-ink)/45">
                <Icon className="h-3 w-3" />
                {title}
            </p>
            <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-4">
                {children}
            </div>
        </div>
    );
}

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof User;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 py-1.5 first:pt-0 last:pb-0">
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

TenantUnit.layout = (page: React.ReactNode) => page;
