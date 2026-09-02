import { Head, router } from '@inertiajs/react';
import { Loader2, MessageCircle, RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type Props = {
    invitationMessage: string | null;
    defaultInvitationMessage: string;
};

const PLACEHOLDERS = [
    { token: '{komplek}', description: 'Nama komplek/perumahan' },
    { token: '{unit}', description: 'Nomor & blok unit warga' },
    { token: '{link}', description: 'Tautan pendaftaran undangan' },
];

function renderPreview(template: string): string {
    return template
        .replaceAll('{komplek}', 'Griya Asri')
        .replaceAll('{unit}', 'A1 12')
        .replaceAll('{link}', `${window.location.origin}/invite/abc123`);
}

export default function SettingsIndex({ invitationMessage, defaultInvitationMessage }: Props) {
    const [message, setMessage] = useState(invitationMessage ?? defaultInvitationMessage);
    const [submitting, setSubmitting] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function save() {
        setSubmitting(true);
        setSaved(false);

        router.put(
            '/admin/settings',
            { invitation_message: message },
            {
                onFinish: () => setSubmitting(false),
                onSuccess: () => {
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2500);
                },
                onError: setErrors,
            },
        );
    }

    function resetToDefault() {
        setMessage(defaultInvitationMessage);
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-[color:var(--color-bg)] p-4 sm:p-6 lg:p-8">
            <Head title="Pengaturan" />

            <div className="flex flex-col gap-1">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-sky-deep)]">
                    Admin · Pengaturan
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-3xl">
                    Pengaturan
                </h1>
            </div>

            <Tabs defaultValue="template-pesan-wa">
                <TabsList>
                    <TabsTrigger value="template-pesan-wa">Template Pesan WA</TabsTrigger>
                    <TabsTrigger value="pengaturan-1">Pengaturan 1</TabsTrigger>
                </TabsList>

                <TabsContent value="template-pesan-wa" className="flex flex-col gap-4">
                    <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--color-ink)]/55">
                        Pesan ini dikirim lewat WhatsApp (Wablas) setiap kali Anda mengundang warga baru dari menu Undangan.
                    </p>

                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <section className="flex flex-col gap-4 rounded-[2rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-6 shadow-elevated lg:p-8">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-[color:var(--color-ink)]" htmlFor="invitation-message">
                                    Isi pesan
                                </label>
                                <Textarea
                                    id="invitation-message"
                                    rows={6}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    maxLength={1000}
                                    className="rounded-xl border-[color:var(--color-ink)]/12 bg-[color:var(--color-bg)] text-sm text-[color:var(--color-ink)] focus-visible:border-[color:var(--color-sky)]/50 focus-visible:ring-[color:var(--color-sky)]/20"
                                />
                                <div className="flex items-center justify-between text-xs text-[color:var(--color-ink)]/40">
                                    <span>{message.length}/1000 karakter</span>
                                </div>
                                {errors.invitation_message && (
                                    <p className="text-sm text-[color:var(--color-coral)]">{errors.invitation_message}</p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2.5">
                                <Button disabled={submitting || message.trim().length === 0} onClick={save}>
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {saved ? 'Tersimpan' : 'Simpan perubahan'}
                                </Button>
                                <Button variant="outline" onClick={resetToDefault} disabled={submitting}>
                                    <RotateCcw className="h-4 w-4" /> Gunakan bawaan
                                </Button>
                            </div>
                        </section>

                        <aside className="flex flex-col gap-4">
                            <div className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-5 shadow-elevated">
                                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-ink)]/50">
                                    Placeholder tersedia
                                </p>
                                <ul className="mt-3 space-y-2.5">
                                    {PLACEHOLDERS.map((p) => (
                                        <li key={p.token} className="flex items-start justify-between gap-3 text-sm">
                                            <code className="shrink-0 rounded-md bg-[color:var(--color-ink)]/5 px-1.5 py-0.5 font-mono text-xs text-[color:var(--color-sky-deep)]">
                                                {p.token}
                                            </code>
                                            <span className="text-right text-[color:var(--color-ink)]/60">{p.description}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="rounded-[1.5rem] border border-[color:var(--color-mint)]/20 bg-[color:var(--color-mint)]/8 p-5">
                                <div className="mb-2 flex items-center gap-2 text-[color:var(--color-mint-deep)]">
                                    <MessageCircle className="h-4 w-4" />
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em]">Pratinjau</p>
                                </div>
                                <p className="rounded-xl bg-[color:var(--color-surface)] p-3 text-sm leading-relaxed whitespace-pre-wrap text-[color:var(--color-ink)]">
                                    {renderPreview(message)}
                                </p>
                            </div>
                        </aside>
                    </div>
                </TabsContent>

                <TabsContent value="pengaturan-1" />
            </Tabs>
        </div>
    );
}
