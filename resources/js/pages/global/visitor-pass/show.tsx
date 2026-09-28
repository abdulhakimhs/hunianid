import { Head } from '@inertiajs/react';
import { AlertTriangle, Car, Clock, MapPin, Sparkles, UserRound, XCircle } from 'lucide-react';

type PassState = 'valid' | 'used' | 'expired' | 'cancelled';

type Props = {
    found: boolean;
    state?: PassState;
    guestName?: string;
    vehicleInfo?: string;
    purpose?: string;
    unitLabel?: string;
    complexName?: string;
    validFrom?: string;
    validUntil?: string;
    qrSvg?: string;
};

const STATE_COPY: Record<PassState, { title: string; description: string; tone: 'mint' | 'coral' }> = {
    valid: {
        title: 'Berlaku',
        description: 'Tunjukkan kode QR ini ke petugas keamanan saat tiba.',
        tone: 'mint',
    },
    used: {
        title: 'Sudah digunakan',
        description: 'Visitor pass ini sudah dipakai untuk masuk sebelumnya.',
        tone: 'coral',
    },
    expired: {
        title: 'Kedaluwarsa',
        description: 'Masa berlaku visitor pass ini sudah berakhir.',
        tone: 'coral',
    },
    cancelled: {
        title: 'Dibatalkan',
        description: 'Visitor pass ini telah dibatalkan oleh penghuni.',
        tone: 'coral',
    },
};

function formatDateTime(iso?: string) {
    if (!iso) return '-';

    return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function VisitorPassShow({
    found,
    state,
    guestName,
    vehicleInfo,
    purpose,
    unitLabel,
    complexName,
    validFrom,
    validUntil,
    qrSvg,
}: Props) {
    if (!found) {
        return (
            <>
                <Head title="Visitor pass tidak ditemukan" />
                <div className="flex flex-col items-center py-2 text-center">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-(--color-coral)/12 text-(--color-coral)">
                        <AlertTriangle className="h-6 w-6" />
                    </span>
                    <h1 className="mt-4 font-display text-lg font-semibold text-(--color-ink)">
                        Visitor pass tidak ditemukan
                    </h1>
                    <p className="mt-1 max-w-sm text-sm leading-relaxed text-(--color-ink)/60">
                        Tautan ini tidak valid atau visitor pass sudah dihapus. Silakan hubungi penghuni yang mengundang Anda.
                    </p>
                </div>
            </>
        );
    }

    const copy = STATE_COPY[state ?? 'valid'];
    const isValid = state === 'valid';

    return (
        <>
            <Head title={`Visitor pass untuk ${guestName}`} />
            <div className="mb-6 space-y-2">
                
                <h1 className="font-display text-lg font-semibold text-(--color-ink)">
                    Visitor Pass untuk {guestName}
                </h1>
                {complexName && (
                    <p className="text-sm leading-relaxed text-(--color-ink)/55">{complexName}</p>
                )}
            </div>

            <div className="flex flex-col items-center gap-4">
                <span
                    className={
                        copy.tone === 'mint'
                            ? 'inline-flex items-center gap-1.5 rounded-full bg-(--color-mint)/12 px-3 py-1 text-xs font-semibold text-(--color-mint-deep)'
                            : 'inline-flex items-center gap-1.5 rounded-full bg-(--color-coral)/12 px-3 py-1 text-xs font-semibold text-(--color-coral)'
                    }
                >
                    {copy.tone === 'coral' ? <XCircle className="h-3.5 w-3.5" /> : null}
                    {copy.title}
                </span>

                {isValid && qrSvg ? (
                    <div
                        className="flex h-64 w-64 items-center justify-center rounded-2xl border border-(--color-ink)/8 bg-white p-4 shadow-elevated"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                ) : (
                    <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-dashed border-(--color-ink)/15 bg-(--color-bg) text-sm text-(--color-ink)/40">
                        QR tidak tersedia
                    </div>
                )}

                <p className="text-center text-sm leading-relaxed text-(--color-ink)/55">{copy.description}</p>

                <div className="w-full space-y-3 rounded-2xl border border-(--color-ink)/8 bg-(--color-bg) p-4 text-sm">
                    <div className="flex items-center gap-2.5">
                        <UserRound className="h-4 w-4 shrink-0 text-(--color-ink)/40" />
                        <span className="text-(--color-ink)">{guestName}</span>
                    </div>
                    {vehicleInfo && (
                        <div className="flex items-center gap-2.5">
                            <Car className="h-4 w-4 shrink-0 text-(--color-ink)/40" />
                            <span className="text-(--color-ink)">{vehicleInfo}</span>
                        </div>
                    )}
                    {unitLabel && (
                        <div className="flex items-center gap-2.5">
                            <MapPin className="h-4 w-4 shrink-0 text-(--color-ink)/40" />
                            <span className="text-(--color-ink)">{unitLabel}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 shrink-0 text-(--color-ink)/40" />
                        <span className="text-(--color-ink)">
                            {formatDateTime(validFrom)} &ndash; {formatDateTime(validUntil)}
                        </span>
                    </div>
                    {purpose && (
                        <p className="border-t border-(--color-ink)/8 pt-3 text-(--color-ink)/60">{purpose}</p>
                    )}
                </div>
            </div>
        </>
    );
}
