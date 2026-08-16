import { Head, router } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type JoinRequest = {
    id: number;
    unit_id: number;
    unit_number: string;
    block: string | null;
    name: string;
    email: string;
};

type Props = {
    requests: JoinRequest[];
};

export default function JoinRequests({ requests }: Props) {
    function confirm(r: JoinRequest) {
        router.post(`/unit/${r.unit_id}/join-requests/${r.id}/confirm`);
    }

    function decline(r: JoinRequest) {
        router.post(`/unit/${r.unit_id}/join-requests/${r.id}/decline`);
    }

    return (
        <div className="p-6">
            <Head title="Permintaan bergabung" />
            <h1 className="font-display text-2xl font-semibold text-[color:var(--color-ink,#142033)]">Permintaan bergabung rumah Anda</h1>

            {requests.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">Tidak ada permintaan yang menunggu.</p>
            ) : (
                <div className="mt-6 grid gap-3">
                    {requests.map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-2xl border border-border p-4">
                            <div>
                                <p className="font-medium">{r.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {r.email} · ingin bergabung di {r.block ? `${r.block} ` : ''}
                                    {r.unit_number}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => confirm(r)}>
                                    <Check className="h-4 w-4" /> Konfirmasi
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => decline(r)}>
                                    <X className="h-4 w-4" /> Tolak
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
