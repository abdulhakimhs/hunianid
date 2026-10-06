import { Head, router } from '@inertiajs/react';
import { Loader2, Megaphone, MessageCircle, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useTableSearch } from '@/hooks/use-table-search';

type AnnouncementRow = {
    id: number;
    title: string;
    body: string;
    sendWhatsapp: boolean;
    broadcastSentAt: string | null;
    sentCount: number;
    authorName: string;
    createdAt: string | null;
};

type Props = {
    announcements: AnnouncementRow[];
};

function formatDateTime(iso: string | null) {
    if (!iso) {
        return '—';
    }

    return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AnnouncementsIndex({ announcements }: Props) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementRow | null>(null);
    const [formData, setFormData] = useState({ title: '', body: '', send_whatsapp: true });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [deletingAnnouncement, setDeletingAnnouncement] = useState<AnnouncementRow | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);

    const { search, setSearch, page, setPage, pageCount, paginated, filtered } = useTableSearch(
        announcements,
        (a, q) => `${a.title} ${a.body}`.toLowerCase().includes(q),
    );

    function resetForm() {
        setFormData({ title: '', body: '', send_whatsapp: true });
        setErrors({});
    }

    function openEditDialog(announcement: AnnouncementRow) {
        setEditingAnnouncement(announcement);
        setFormData({ title: announcement.title, body: announcement.body, send_whatsapp: announcement.sendWhatsapp });
    }

    function submitForm() {
        setSubmitting(true);

        const options = {
            onSuccess: () => {
                setShowCreateDialog(false);
                setEditingAnnouncement(null);
                resetForm();
            },
            onError: setErrors,
            onFinish: () => setSubmitting(false),
        };

        if (editingAnnouncement) {
            router.put(`/admin/announcements/${editingAnnouncement.id}`, {
                title: formData.title,
                body: formData.body,
            }, options);
        } else {
            router.post('/admin/announcements', formData, options);
        }
    }

    function confirmDelete() {
        if (!deletingAnnouncement) {
            return;
        }

        setDeletingBusy(true);

        router.delete(`/admin/announcements/${deletingAnnouncement.id}`, {
            onSuccess: () => setDeletingAnnouncement(null),
            onFinish: () => setDeletingBusy(false),
        });
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Pengumuman" />

            <div className="flex">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Pengumuman
                </p>
            </div>

            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Pengumuman
                </h1>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4" />
                    Buat Pengumuman
                </Button>
            </div>

            <p className="text-sm text-(--color-ink)/50">
                Pengumuman langsung tampil di aplikasi semua penghuni area ini. Centang "Kirim ke WhatsApp" untuk
                juga mengirimkannya sebagai pesan WhatsApp ke setiap penghuni aktif.
            </p>

            <section className="shadow-elevated overflow-hidden rounded-2xl border border-(--color-ink)/8 bg-(--color-surface)">
                <div className="flex items-center justify-between border-b border-(--color-ink)/8 px-4 py-3">
                    <p className="text-sm font-medium text-(--color-ink)">Daftar Pengumuman</p>
                    <div className="relative w-full sm:w-56">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--color-ink)/35" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari judul atau isi..."
                            className="w-full rounded-lg border border-(--color-ink)/10 bg-(--color-bg) py-1.5 pr-3 pl-8 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                        />
                    </div>
                </div>

                <Table className="w-full table-fixed">
                    <TableHeader>
                        <TableRow className="border-(--color-ink)/8 hover:bg-transparent">
                            <TableHead className="h-8 pl-4 text-[11px] font-medium text-(--color-ink)/40">Judul</TableHead>
                            <TableHead className="h-8 w-32 text-[11px] font-medium text-(--color-ink)/40">WhatsApp</TableHead>
                            <TableHead className="h-8 w-40 text-[11px] font-medium text-(--color-ink)/40">Dibuat</TableHead>
                            <TableHead className="h-8 w-28 pr-4 text-right text-[11px] font-medium text-(--color-ink)/40">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map((announcement) => (
                            <TableRow key={announcement.id} className="border-(--color-ink)/6 last:border-0">
                                <TableCell className="py-2 pl-4">
                                    <p className="text-sm font-medium text-(--color-ink)">{announcement.title}</p>
                                    <p className="truncate text-xs text-(--color-ink)/50">{announcement.body}</p>
                                </TableCell>
                                <TableCell className="py-2">
                                    {announcement.sendWhatsapp ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-(--color-mint)/12 px-2 py-0.5 text-xs font-medium text-(--color-mint-deep)">
                                            <MessageCircle className="h-3 w-3" />
                                            {announcement.sentCount} terkirim
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-(--color-ink)/6 px-2 py-0.5 text-xs font-medium text-(--color-ink)/50">
                                            Dalam aplikasi saja
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="py-2">
                                    <span className="text-xs text-(--color-ink)/50">{formatDateTime(announcement.createdAt)}</span>
                                </TableCell>
                                <TableCell className="py-2 pr-4">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <Button
                                            size="icon"
                                            className="h-7 w-7 bg-(--color-mint) text-white hover:bg-(--color-mint-deep)"
                                            title="Edit"
                                            onClick={() => openEditDialog(announcement)}
                                        >
                                            <SquarePen className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7 text-(--color-coral) hover:bg-(--color-coral)/10"
                                            title="Hapus"
                                            onClick={() => setDeletingAnnouncement(announcement)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {filtered.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--color-ink)/5 text-(--color-ink)/40">
                            <Megaphone className="h-4.5 w-4.5" />
                        </span>
                        <p className="text-sm text-(--color-ink)/50">
                            {announcements.length === 0
                                ? 'Belum ada pengumuman. Buat yang pertama untuk penghuni area ini.'
                                : 'Tidak ada pengumuman yang cocok dengan pencarian.'}
                        </p>
                    </div>
                )}

                <DataTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </section>

            {/* Create/edit dialog */}
            <Dialog
                open={showCreateDialog || !!editingAnnouncement}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowCreateDialog(false);
                        setEditingAnnouncement(null);
                        resetForm();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAnnouncement ? 'Edit Pengumuman' : 'Buat Pengumuman'}</DialogTitle>
                        <DialogDescription>
                            {editingAnnouncement
                                ? 'Perbarui judul atau isi pengumuman ini.'
                                : 'Pengumuman akan langsung tampil di aplikasi semua penghuni area ini.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">Judul</label>
                            <Input
                                value={formData.title}
                                placeholder="Contoh: Pemadaman Air Sementara"
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                            {errors.title && <p className="text-sm text-(--color-coral)">{errors.title}</p>}
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">Isi Pengumuman</label>
                            <Textarea
                                rows={5}
                                value={formData.body}
                                placeholder="Tulis detail pengumuman di sini..."
                                maxLength={2000}
                                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            />
                            {errors.body && <p className="text-sm text-(--color-coral)">{errors.body}</p>}
                        </div>

                        {!editingAnnouncement && (
                            <label className="flex items-center gap-2.5 text-sm font-medium text-(--color-ink)">
                                <Checkbox
                                    checked={formData.send_whatsapp}
                                    onCheckedChange={() =>
                                        setFormData({ ...formData, send_whatsapp: !formData.send_whatsapp })
                                    }
                                />
                                Kirim juga ke WhatsApp semua penghuni
                            </label>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCreateDialog(false);
                                setEditingAnnouncement(null);
                                resetForm();
                            }}
                            disabled={submitting}
                        >
                            Batal
                        </Button>
                        <Button disabled={!formData.title || !formData.body || submitting} onClick={submitForm}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editingAnnouncement ? 'Simpan Perubahan' : 'Buat Pengumuman'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={!!deletingAnnouncement} onOpenChange={(open) => !open && setDeletingAnnouncement(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Pengumuman</DialogTitle>
                        <DialogDescription>
                            Yakin ingin menghapus pengumuman{' '}
                            <span className="font-medium text-(--color-ink)">{deletingAnnouncement?.title}</span>?
                            Pengumuman akan langsung hilang dari aplikasi penghuni.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingAnnouncement(null)} disabled={deletingBusy}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deletingBusy}>
                            {deletingBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
