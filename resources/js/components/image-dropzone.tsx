import { ImageUp, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';

const MAX_SIZE = 5 * 1024 * 1024;

type Props = {
    value: File | null;
    onChange: (file: File | null) => void;
    disabled?: boolean;
};

function rejectionMessage(rejections: FileRejection[]): string {
    const code = rejections[0]?.errors[0]?.code;

    if (code === 'file-too-large') {
        return 'Ukuran maksimal 5 MB.';
    }

    if (code === 'too-many-files') {
        return 'Hanya satu gambar yang bisa diunggah.';
    }

    return 'Format harus JPG, PNG, atau WEBP.';
}

export function ImageDropzone({ value, onChange, disabled }: Props) {
    const [error, setError] = useState<string | null>(null);
    const preview = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);

    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
        maxSize: MAX_SIZE,
        maxFiles: 1,
        multiple: false,
        disabled,
        onDrop: (accepted, rejections) => {
            if (rejections.length > 0) {
                setError(rejectionMessage(rejections));

                return;
            }

            setError(null);
            onChange(accepted[0] ?? null);
        },
    });

    if (value && preview) {
        return (
            <div className="relative overflow-hidden rounded-2xl border bg-muted/30">
                <img src={preview} alt="Pratinjau bukti bayar" className="max-h-64 w-full object-contain" />
                <div className="flex items-center justify-between gap-2 border-t bg-background px-3 py-2 text-xs">
                    <span className="truncate text-muted-foreground">{value.name}</span>
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-(--color-coral) hover:bg-(--color-coral)/10 disabled:opacity-50"
                    >
                        <X className="h-3.5 w-3.5" />
                        Hapus
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div
                {...getRootProps()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                    isDragActive ? 'border-(--color-mint) bg-(--color-mint)/8' : 'border-border hover:bg-muted/40'
                } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            >
                <input {...getInputProps()} />
                <ImageUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                    {isDragActive ? 'Lepaskan gambar di sini' : 'Seret gambar ke sini, atau klik untuk memilih'}
                </p>
                <p className="text-xs text-muted-foreground">JPG, PNG, atau WEBP. Maksimal 5 MB.</p>
            </div>
            {error && <p className="mt-2 text-xs text-(--color-coral)">{error}</p>}
        </div>
    );
}
