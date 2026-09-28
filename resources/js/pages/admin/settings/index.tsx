import { Head, router } from '@inertiajs/react';
import { Loader2, MessageCircle, RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type Props = {
    invitationMessage: string | null;
    defaultInvitationMessage: string;
    securityInvitationMessage: string | null;
    defaultSecurityInvitationMessage: string;
};

const PLACEHOLDERS = [
    { token: '{komplek}', description: 'Nama komplek/perumahan' },
    { token: '{unit}', description: 'Nomor & blok unit warga' },
    { token: '{link}', description: 'Tautan pendaftaran undangan' },
];

const SECURITY_PLACEHOLDERS = [
    { token: '{nama}', description: 'Nama Security' },
    { token: '{komplek}', description: 'Nama komplek/perumahan' },
    { token: '{link}', description: 'Tautan buat kata sandi' },
];

function renderPreview(template: string): string {
    return template
        .replaceAll('{komplek}', 'Griya Asri')
        .replaceAll('{unit}', 'A1 12')
        .replaceAll('{link}', `${window.location.origin}/invite/abc123`);
}

function renderSecurityPreview(template: string): string {
    return template
        .replaceAll('{nama}', 'Ahmad')
        .replaceAll('{komplek}', 'Griya Asri')
        .replaceAll('{link}', `${window.location.origin}/security/claim/abc123`);
}

function TemplateEditor({
    id,
    message,
    setMessage,
    onSave,
    submitting,
    saved,
    error,
    placeholders,
    preview,
}: {
    id: string;
    message: string;
    setMessage: (v: string) => void;
    onSave: () => void;
    submitting: boolean;
    saved: boolean;
    error?: string;
    placeholders: { token: string; description: string }[];
    preview: string;
}) {
    return (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="flex flex-col gap-4 rounded-[2rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-6 shadow-elevated lg:p-8">
                <div className="grid gap-2">
                    <label className="text-sm font-medium text-[color:var(--color-ink)]" htmlFor={id}>
                        Isi pesan
                    </label>
                    <Textarea
                        id={id}
                        rows={6}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        maxLength={1000}
                        className="rounded-xl border-[color:var(--color-ink)]/12 bg-[color:var(--color-bg)] text-sm text-[color:var(--color-ink)] focus-visible:border-[color:var(--color-sky)]/50 focus-visible:ring-[color:var(--color-sky)]/20"
                    />
                    <div className="flex items-center justify-between text-xs text-[color:var(--color-ink)]/40">
                        <span>{message.length}/1000 karakter</span>
                    </div>
                    {error && <p className="text-sm text-[color:var(--color-coral)]">{error}</p>}
                </div>

                <div className="flex flex-wrap gap-2.5">
                    <Button disabled={submitting || message.trim().length === 0} onClick={onSave}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saved ? 'Tersimpan' : 'Simpan perubahan'}
                    </Button>
                </div>
            </section>

            <aside className="flex flex-col gap-4">
                <div className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-5 shadow-elevated">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-ink)]/50">
                        Placeholder tersedia
                    </p>
                    <ul className="mt-3 space-y-2.5">
                        {placeholders.map((p) => (
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
                        {preview}
                    </p>
                </div>
            </aside>
        </div>
    );
}

export default function SettingsIndex({
    invitationMessage,
    defaultInvitationMessage,
    securityInvitationMessage,
    defaultSecurityInvitationMessage,
}: Props) {
    const [message, setMessage] = useState(invitationMessage ?? defaultInvitationMessage);
    const [submitting, setSubmitting] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [securityMessage, setSecurityMessage] = useState(
        securityInvitationMessage ?? defaultSecurityInvitationMessage,
    );
    const [securitySubmitting, setSecuritySubmitting] = useState(false);
    const [securitySaved, setSecuritySaved] = useState(false);
    const [securityErrors, setSecurityErrors] = useState<Record<string, string>>({});

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

    function saveSecurityMessage() {
        setSecuritySubmitting(true);
        setSecuritySaved(false);

        router.put(
            '/admin/settings/security-message',
            { security_invitation_message: securityMessage },
            {
                onFinish: () => setSecuritySubmitting(false),
                onSuccess: () => {
                    setSecuritySaved(true);
                    setTimeout(() => setSecuritySaved(false), 2500);
                },
                onError: setSecurityErrors,
            },
        );
    }

    function resetSecurityToDefault() {
        setSecurityMessage(defaultSecurityInvitationMessage);
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
                    <TabsTrigger value="template-pesan-wa">Template Pesan Warga</TabsTrigger>
                    <TabsTrigger value="template-pesan-security">Template Pesan Security</TabsTrigger>
                </TabsList>

                <TabsContent value="template-pesan-wa" className="flex flex-col gap-4">
                    <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--color-ink)]/55">
                        Pesan ini dikirim lewat WhatsApp (Wablas) setiap kali Anda mengundang warga baru dari menu Undangan.
                    </p>

                    <div className="flex flex-wrap gap-2.5">
                        <Button variant="outline" size="sm" onClick={resetToDefault} disabled={submitting}>
                            <RotateCcw className="h-4 w-4" /> Gunakan bawaan
                        </Button>
                    </div>

                    <TemplateEditor
                        id="invitation-message"
                        message={message}
                        setMessage={setMessage}
                        onSave={save}
                        submitting={submitting}
                        saved={saved}
                        error={errors.invitation_message}
                        placeholders={PLACEHOLDERS}
                        preview={renderPreview(message)}
                    />
                </TabsContent>

                <TabsContent value="template-pesan-security" className="flex flex-col gap-4">
                    <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--color-ink)]/55">
                        Pesan ini dikirim lewat WhatsApp (Wablas) setiap kali Anda mengundang Security dari halaman Undangan
                        Security agar mereka membuat kata sandi sendiri.
                    </p>

                    <div className="flex flex-wrap gap-2.5">
                        <Button variant="outline" size="sm" onClick={resetSecurityToDefault} disabled={securitySubmitting}>
                            <RotateCcw className="h-4 w-4" /> Gunakan bawaan
                        </Button>
                    </div>

                    <TemplateEditor
                        id="security-invitation-message"
                        message={securityMessage}
                        setMessage={setSecurityMessage}
                        onSave={saveSecurityMessage}
                        submitting={securitySubmitting}
                        saved={securitySaved}
                        error={securityErrors.security_invitation_message}
                        placeholders={SECURITY_PLACEHOLDERS}
                        preview={renderSecurityPreview(securityMessage)}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
