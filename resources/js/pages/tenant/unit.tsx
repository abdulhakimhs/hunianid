import { Head } from '@inertiajs/react';
import { Building2, Mail, Phone, User, Users } from 'lucide-react';
import PageHeader from '@/components/shared/page-header';
import TenantBottomNav from '@/components/tenant/bottom-nav';

// Dummy data — swap for real props from GET /tenant/unit once the backend
// endpoint exists.

const dummyUnit = {
    number: 'B-08',
    area: 'Cluster Melati',
    type: 'Pemilik',
};

const dummyResident = {
    name: 'Dewi Lestari',
    phone: '0812-3456-7890',
    email: 'dewi.lestari@email.com',
};

const dummyFamilyMembers = [
    { id: 1, name: 'Andi Lestari', relation: 'Suami' },
    { id: 2, name: 'Kirana Lestari', relation: 'Anak' },
];

const dummyManagement = {
    phone: '021-5551234',
    email: 'pengelola@hunianid.com',
    hours: 'Senin–Sabtu, 08:00–17:00',
};

export default function TenantUnit() {
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
                                    Unit {dummyUnit.number}
                                </p>
                                <p className="text-xs text-white/60">
                                    {dummyUnit.area}
                                </p>
                            </div>
                        </div>

                        <span className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium">
                            {dummyUnit.type}
                        </span>
                    </div>

                    {/* Resident info */}
                    <Section title="Informasi Penghuni" icon={User}>
                        <InfoRow
                            icon={User}
                            label="Nama"
                            value={dummyResident.name}
                        />
                        <InfoRow
                            icon={Phone}
                            label="No. HP"
                            value={dummyResident.phone}
                        />
                        <InfoRow
                            icon={Mail}
                            label="Email"
                            value={dummyResident.email}
                        />
                    </Section>

                    {/* Family members */}
                    <Section title="Anggota Keluarga" icon={Users}>
                        {dummyFamilyMembers.length === 0 ? (
                            <p className="text-sm text-(--color-ink)/40">
                                Belum ada anggota keluarga terdaftar.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {dummyFamilyMembers.map((member) => (
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
                                            <p className="text-xs text-(--color-ink)/45">
                                                {member.relation}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* Management contact */}
                    <Section title="Kontak Pengelola" icon={Phone}>
                        <a
                            href={`tel:${dummyManagement.phone}`}
                            className="flex items-center gap-3"
                        >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-mint)/12 text-(--color-mint-deep)">
                                <Phone className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-(--color-ink)">
                                    {dummyManagement.phone}
                                </p>
                                <p className="text-xs text-(--color-ink)/45">
                                    {dummyManagement.hours}
                                </p>
                            </div>
                        </a>

                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-ink)/5">
                                <Mail className="h-4 w-4 text-(--color-ink)/50" />
                            </div>
                            <p className="truncate text-sm text-(--color-ink)/70">
                                {dummyManagement.email}
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
