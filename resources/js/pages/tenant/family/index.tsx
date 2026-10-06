import { Head, router } from '@inertiajs/react';
import { Loader2, Phone, Plus, SquarePen, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Family, UnitOption } from '@/types';

type Props = {
    families: Family[];
    units: UnitOption[];
};

function formatUnit(unit: Family['unit'] | null | undefined): string {
    if (!unit) {
        return '—';
    }

    return unit.block ? `${unit.unit_number} · ${unit.block}` : unit.unit_number;
}

export default function TenantFamily({ families, units }: Props) {
    const [editing, setEditing] = useState<Family | null>(null);
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState<Family | null>(null);

    return (
        <>
            <Head title="Kelola Keluarga" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-surface) pb-[env(safe-area-inset-bottom)]">
                <PageHeader title="Kelola Keluarga" backHref="/tenant/unit" tone="tenant" />

                <div className="flex-1 space-y-2.5 overflow-y-auto px-5 pt-4 pb-24">
                    {units.length === 0 && (
                        <p className="text-sm text-(--color-ink)/55">
                            Anda belum terdaftar sebagai penghuni aktif di unit manapun, jadi belum bisa menambahkan
                            anggota keluarga.
                        </p>
                    )}

                    {families.length === 0 ? (
                        <EmptyState />
                    ) : (
                        families.map((family) => (
                            <FamilyCard
                                key={family.id}
                                family={family}
                                onEdit={() => setEditing(family)}
                                onDelete={() => setDeleting(family)}
                            />
                        ))
                    )}
                </div>

                <Button
                    onClick={() => setAdding(true)}
                    disabled={units.length === 0}
                    className="fixed inset-x-5 bottom-5 mx-auto h-13 max-w-sm bg-(--color-sky-deep) text-base hover:bg-(--color-sky-deep)/90"
                >
                    <Plus className="h-5 w-5" />
                    Tambah Anggota
                </Button>
            </div>

            {adding && <FamilySheet units={units} onClose={() => setAdding(false)} />}

            {editing && (
                <FamilySheet units={units} family={editing} onClose={() => setEditing(null)} />
            )}

            {deleting && <DeleteConfirmSheet family={deleting} onClose={() => setDeleting(null)} />}
        </>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center gap-2 pt-16 text-center">
            <Users className="h-8 w-8 text-(--color-ink)/25" />
            <p className="text-sm text-(--color-ink)/45">Belum ada anggota keluarga terdaftar.</p>
        </div>
    );
}

function FamilyCard({
    family,
    onEdit,
    onDelete,
}: {
    family: Family;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-4">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--color-ink)/5 text-(--color-ink)/50">
                    <Users className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-(--color-ink)">{family.user.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-(--color-ink)/50">
                        <Phone className="h-3 w-3 shrink-0" />
                        {family.user.phone ?? '—'}
                    </p>
                    <p className="mt-1 text-[11px] text-(--color-ink)/40">Unit {formatUnit(family.unit)}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                    <Button variant="outline" size="icon" className="h-8 w-8" title="Edit" onClick={onEdit}>
                        <SquarePen className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-(--color-coral) hover:bg-(--color-coral)/10"
                        title="Hapus"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function FamilySheet({
    units,
    family,
    onClose,
}: {
    units: UnitOption[];
    family?: Family;
    onClose: () => void;
}) {
    const [name, setName] = useState(family?.user.name ?? '');
    const [waNumber, setWaNumber] = useState(family?.user.phone ?? '');
    const [unitId, setUnitId] = useState(
        family ? String(family.unit.id) : units.length === 1 ? String(units[0].id) : '',
    );
    const [submitting, setSubmitting] = useState(false);

    function submit() {
        if (!name.trim() || !waNumber.trim() || !unitId) {
            return;
        }

        setSubmitting(true);

        const data = { name, wa_number: waNumber, unit_id: unitId };
        const options = {
            onSuccess: onClose,
            onFinish: () => setSubmitting(false),
        };

        if (family) {
            router.put(`/family/${family.id}`, data, options);
        } else {
            router.post('/family', data, options);
        }
    }

    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <p className="mb-4 text-base font-semibold text-(--color-ink)">
                    {family ? 'Edit Anggota Keluarga' : 'Tambah Anggota Keluarga'}
                </p>

                <div className="space-y-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="name">Nama</Label>
                        <Input
                            id="name"
                            autoFocus
                            placeholder="Contoh: Siti Aminah"
                            className="h-12 text-base"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="wa_number">No. WhatsApp</Label>
                        <Input
                            id="wa_number"
                            type="tel"
                            placeholder="Contoh: 0812xxxxxxx"
                            className="h-12 text-base"
                            value={waNumber}
                            onChange={(e) => setWaNumber(e.target.value)}
                        />
                    </div>

                    {units.length > 1 && (
                        <div className="grid gap-1.5">
                            <Label>Unit</Label>
                            <Select value={unitId} onValueChange={setUnitId}>
                                <SelectTrigger className="h-12 w-full text-base">
                                    <SelectValue placeholder="Pilih unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.block ? `${u.unit_number} · ${u.block}` : u.unit_number}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="mt-5 flex gap-2">
                    <Button variant="outline" className="h-12 flex-1" onClick={onClose} disabled={submitting}>
                        Batal
                    </Button>
                    <Button
                        className="h-12 flex-1"
                        onClick={submit}
                        disabled={!name.trim() || !waNumber.trim() || !unitId || submitting}
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {family ? 'Simpan Perubahan' : 'Tambah'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function DeleteConfirmSheet({ family, onClose }: { family: Family; onClose: () => void }) {
    const [submitting, setSubmitting] = useState(false);

    function confirm() {
        setSubmitting(true);

        router.delete(`/family/${family.id}`, {
            onSuccess: onClose,
            onFinish: () => setSubmitting(false),
        });
    }

    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <p className="mb-2 text-base font-semibold text-(--color-ink)">Hapus Anggota Keluarga</p>
                <p className="text-sm text-(--color-ink)/60">
                    Yakin ingin menghapus <span className="font-medium text-(--color-ink)">{family.user.name}</span>{' '}
                    dari unit {formatUnit(family.unit)}? Anggota ini hanya dilepas dari unit; data pengguna tetap
                    ada.
                </p>

                <div className="mt-5 flex gap-2">
                    <Button variant="outline" className="h-12 flex-1" onClick={onClose} disabled={submitting}>
                        Batal
                    </Button>
                    <Button variant="destructive" className="h-12 flex-1" onClick={confirm} disabled={submitting}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Hapus
                    </Button>
                </div>
            </div>
        </div>
    );
}

TenantFamily.layout = (page: React.ReactNode) => page;
