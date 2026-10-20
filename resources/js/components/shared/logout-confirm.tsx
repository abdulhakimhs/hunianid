import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LogoutConfirm({
    loading,
    onCancel,
    onConfirm,
}: {
    loading: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <p className="text-center text-base font-semibold text-(--color-ink)">
                    Keluar dari akun?
                </p>
                <p className="mt-1 text-center text-sm text-(--color-ink)/50">
                    Anda perlu memasukkan No. HP dan kata sandi kembali untuk
                    masuk.
                </p>

                <div className="mt-5 flex gap-2">
                    <Button
                        variant="outline"
                        className="h-12 flex-1"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Batal
                    </Button>
                    <Button
                        className="h-12 flex-1 bg-red-600 hover:bg-red-600/90"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Keluar
                    </Button>
                </div>
            </div>
        </div>
    );
}
