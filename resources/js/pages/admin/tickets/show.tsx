import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CircleCheck,
    Loader2,
    MessageSquareText,
    Send,
    ShieldCheck,
    User as UserIcon,
} from 'lucide-react';
import { useState } from 'react';
import { ImageDropzone } from '@/components/image-dropzone';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type TicketCategory = 'maintenance' | 'security' | 'cleanliness' | 'other';
type TicketStatus = 'open' | 'in_progress' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high';

type ActivityEntry = {
    id: number;
    sender: 'tenant' | 'staff' | 'system';
    staffName?: string | null;
    body: string;
    photoUrl?: string | null;
    isInternal: boolean;
    sentAt: string;
};

type TicketDetail = {
    id: number;
    subject: string;
    category: TicketCategory;
    priority: TicketPriority | null;
    status: TicketStatus;
    reporter: { id: number; name: string; phone: string | null; whatsappNumber: string | null };
    unit: { id: number; label: string };
    assignedTo: { id: number; name: string } | null;
    activity: ActivityEntry[];
};

type Props = {
    ticket: TicketDetail;
    staffOptions: { id: number; name: string }[];
};

const categoryLabel: Record<TicketCategory, string> = {
    maintenance: 'Perbaikan',
    security: 'Keamanan',
    cleanliness: 'Kebersihan',
    other: 'Lainnya',
};

const statusMeta: Record<TicketStatus, { label: string; className: string }> = {
    open: { label: 'Terbuka', className: 'bg-(--color-sky)/15 text-(--color-sky-deep)' },
    in_progress: { label: 'Diproses', className: 'bg-amber-100 text-amber-600' },
    closed: { label: 'Selesai', className: 'bg-(--color-ink)/8 text-(--color-ink)/50' },
};

const priorityMeta: Record<'none' | TicketPriority, { label: string; className: string }> = {
    none: { label: 'Belum diatur', className: 'bg-(--color-ink)/6 text-(--color-ink)/45' },
    low: { label: 'Rendah', className: 'bg-(--color-mint)/12 text-(--color-mint-deep)' },
    medium: { label: 'Sedang', className: 'bg-amber-100 text-amber-600' },
    high: { label: 'Tinggi', className: 'bg-(--color-coral)/12 text-(--color-coral)' },
};

function formatTime(iso: string) {
    return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminTicketShow({ ticket, staffOptions }: Props) {
    const [statusNote, setStatusNote] = useState('');
    const [statusPhoto, setStatusPhoto] = useState<File | null>(null);
    const [pendingAction, setPendingAction] = useState<'in_progress' | 'closed' | 'update' | null>(null);
    const [updatingAssignee, setUpdatingAssignee] = useState(false);
    const [updatingPriority, setUpdatingPriority] = useState(false);
    const [noteBody, setNoteBody] = useState('');
    const [notePhoto, setNotePhoto] = useState<File | null>(null);
    const [addingNote, setAddingNote] = useState(false);

    const status = statusMeta[ticket.status];
    const priority = priorityMeta[ticket.priority ?? 'none'];
    const isClosed = ticket.status === 'closed';

    function updateStatus(next: 'in_progress' | 'closed') {
        setPendingAction(next);
        router.patch(
            `/admin/tickets/${ticket.id}/status`,
            { status: next, note: statusNote || undefined, photo: statusPhoto },
            {
                forceFormData: true,
                onFinish: () => setPendingAction(null),
                onSuccess: () => {
                    setStatusNote('');
                    setStatusPhoto(null);
                },
            },
        );
    }

    function sendUpdate() {
        if (!statusNote.trim()) {
            return;
        }

        setPendingAction('update');
        router.post(
            `/admin/tickets/${ticket.id}/update`,
            { note: statusNote, photo: statusPhoto },
            {
                forceFormData: true,
                onFinish: () => setPendingAction(null),
                onSuccess: () => {
                    setStatusNote('');
                    setStatusPhoto(null);
                },
            },
        );
    }

    function updateAssignee(value: string) {
        setUpdatingAssignee(true);
        router.patch(
            `/admin/tickets/${ticket.id}/assign`,
            { assigned_to: value === 'none' ? null : Number(value) },
            { onFinish: () => setUpdatingAssignee(false) },
        );
    }

    function updatePriority(value: string) {
        setUpdatingPriority(true);
        router.patch(
            `/admin/tickets/${ticket.id}/priority`,
            { priority: value === 'none' ? null : value },
            { onFinish: () => setUpdatingPriority(false) },
        );
    }

    function submitNote() {
        if (!noteBody.trim()) {
            return;
        }

        setAddingNote(true);
        router.post(
            `/admin/tickets/${ticket.id}/notes`,
            { body: noteBody, photo: notePhoto },
            {
                forceFormData: true,
                onFinish: () => setAddingNote(false),
                onSuccess: () => {
                    setNoteBody('');
                    setNotePhoto(null);
                },
            },
        );
    }

    const originalReport = ticket.activity[0];

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title={ticket.subject} />

            <Link href="/admin/tickets" className="flex items-center gap-1.5 text-sm text-(--color-ink)/50">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke daftar tiket
            </Link>

            <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-5 shadow-elevated">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink)">{ticket.subject}</h1>
                        <p className="mt-1 flex items-center gap-2 text-sm text-(--color-ink)/50">
                            <UserIcon className="h-4 w-4" />
                            {ticket.reporter.name} · {ticket.unit.label} · {categoryLabel[ticket.category]}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${priority.className}`}>{priority.label}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                    </div>
                </div>

                {ticket.reporter.whatsappNumber && (
                    <a
                        href={`https://wa.me/${ticket.reporter.whatsappNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-(--color-mint) px-4 py-2 text-sm font-semibold text-white hover:bg-(--color-mint-deep)"
                    >
                        <Send className="h-4 w-4" />
                        Chat di WhatsApp
                    </a>
                )}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <label className="text-xs font-medium text-(--color-ink)/50">Prioritas</label>
                        <Select
                            value={ticket.priority ?? 'none'}
                            onValueChange={updatePriority}
                            disabled={updatingPriority}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Belum diatur</SelectItem>
                                <SelectItem value="low">Rendah</SelectItem>
                                <SelectItem value="medium">Sedang</SelectItem>
                                <SelectItem value="high">Tinggi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-1.5">
                        <label className="text-xs font-medium text-(--color-ink)/50">Ditugaskan ke</label>
                        <Select
                            value={ticket.assignedTo ? String(ticket.assignedTo.id) : 'none'}
                            onValueChange={updateAssignee}
                            disabled={updatingAssignee}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Belum ditugaskan</SelectItem>
                                {staffOptions.map((staff) => (
                                    <SelectItem key={staff.id} value={String(staff.id)}>
                                        {staff.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {originalReport && (
                <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-5">
                    <p className="text-xs font-semibold tracking-wide text-(--color-ink)/40 uppercase">Laporan Awal</p>
                    <p className="mt-2 text-sm leading-relaxed text-(--color-ink)">{originalReport.body}</p>
                    {originalReport.photoUrl && (
                        <a href={originalReport.photoUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                            <img src={originalReport.photoUrl} alt="Lampiran foto" className="max-h-64 rounded-xl object-cover" />
                        </a>
                    )}
                    <p className="mt-2 text-xs text-(--color-ink)/40">{formatTime(originalReport.sentAt)}</p>
                </div>
            )}

            <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-5">
                <p className="text-xs font-semibold tracking-wide text-(--color-ink)/40 uppercase">Aktivitas</p>
                <div className="mt-3 space-y-2.5">
                    {ticket.activity.slice(1).length === 0 && (
                        <p className="text-sm text-(--color-ink)/45">Belum ada aktivitas lain.</p>
                    )}
                    {ticket.activity.slice(1).map((entry) => (
                        <ActivityRow key={entry.id} entry={entry} />
                    ))}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-5">
                    <p className="text-xs font-semibold tracking-wide text-(--color-ink)/40 uppercase">Kirim ke Penghuni</p>
                    {isClosed ? (
                        <p className="mt-3 text-sm text-(--color-ink)/45">Tiket ini sudah ditutup.</p>
                    ) : (
                        <div className="mt-3 space-y-3">
                            <Textarea
                                rows={2}
                                placeholder="Perkembangan/catatan untuk penghuni — dikirim lewat WhatsApp"
                                value={statusNote}
                                onChange={(e) => setStatusNote(e.target.value)}
                            />
                            <ImageDropzone value={statusPhoto} onChange={setStatusPhoto} disabled={pendingAction !== null} />
                            <div className="flex flex-wrap gap-2">
                                {ticket.status === 'in_progress' && (
                                    <Button
                                        variant="outline"
                                        disabled={pendingAction !== null || !statusNote.trim()}
                                        onClick={sendUpdate}
                                    >
                                        {pendingAction === 'update' && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Kirim Update
                                    </Button>
                                )}
                                {ticket.status === 'open' && (
                                    <Button
                                        variant="outline"
                                        disabled={pendingAction !== null}
                                        onClick={() => updateStatus('in_progress')}
                                    >
                                        {pendingAction === 'in_progress' && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Tandai Diproses
                                    </Button>
                                )}
                                <Button
                                    className="bg-(--color-mint) text-white hover:bg-(--color-mint-deep)"
                                    disabled={pendingAction !== null}
                                    onClick={() => updateStatus('closed')}
                                >
                                    {pendingAction === 'closed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
                                    Tandai Selesai
                                </Button>
                            </div>
                            {ticket.status === 'in_progress' && (
                                <p className="text-xs text-(--color-ink)/40">
                                    "Kirim Update" mengirim catatan tanpa mengubah status. Isi catatan juga ikut
                                    terkirim jika Anda menekan "Tandai Selesai".
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-5">
                    <p className="text-xs font-semibold tracking-wide text-(--color-ink)/40 uppercase">Catatan Internal</p>
                    <p className="mt-1 text-xs text-(--color-ink)/45">Hanya terlihat oleh staff/pengelola, tidak dikirim ke penghuni.</p>
                    <div className="mt-3 space-y-3">
                        <Textarea
                            rows={2}
                            placeholder="Tulis catatan internal..."
                            value={noteBody}
                            onChange={(e) => setNoteBody(e.target.value)}
                        />
                        <ImageDropzone value={notePhoto} onChange={setNotePhoto} disabled={addingNote} />
                        <Button disabled={!noteBody.trim() || addingNote} onClick={submitNote}>
                            {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
                            Simpan Catatan
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
    if (entry.sender === 'system') {
        return (
            <div className="flex items-start gap-2.5 rounded-xl bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-ink)/65">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-sky-deep)" />
                <div className="min-w-0 flex-1">
                    <p>{entry.body}</p>
                    <p className="mt-0.5 text-xs text-(--color-ink)/40">{formatTime(entry.sentAt)}</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm ${
                entry.isInternal ? 'bg-amber-50 text-(--color-ink)' : 'bg-(--color-bg) text-(--color-ink)'
            }`}
        >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ink)/40" />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-(--color-ink)/55">{entry.staffName ?? 'Admin'}</span>
                    {entry.isInternal && (
                        <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-semibold text-amber-800 uppercase">
                            Internal
                        </span>
                    )}
                </div>
                <p className="mt-0.5">{entry.body}</p>
                {entry.photoUrl && (
                    <a href={entry.photoUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                        <img src={entry.photoUrl} alt="Lampiran foto" className="max-h-48 rounded-xl object-cover" />
                    </a>
                )}
                <p className="mt-1 text-xs text-(--color-ink)/40">{formatTime(entry.sentAt)}</p>
            </div>
        </div>
    );
}
