import { AlertOctagon, Clock, MapPin, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export type PanicAlert = {
    id: number;
    tenantName: string;
    unit: string;
    triggeredAt: number; // epoch ms, so we can compute a live "x detik lalu"
};

// Loops a two-tone siren beep via Web Audio API until acknowledged — no
// audio asset file needed, and it can't fail to load on a flaky connection.
function useSirenSound(active: boolean) {
    const ctxRef = useRef<AudioContext | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!active) {
            return;
        }

        const ctx = new AudioContext();
        ctxRef.current = ctx;

        function beep(freq: number) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        }

        let toggle = false;
        beep(880);
        intervalRef.current = setInterval(() => {
            toggle = !toggle;
            beep(toggle ? 880 : 660);
        }, 500);

        if (navigator.vibrate) {
            navigator.vibrate([400, 200, 400, 200, 400]);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            ctx.close();
        };
    }, [active]);
}

function timeAgo(triggeredAt: number, now: number) {
    const seconds = Math.max(0, Math.floor((now - triggeredAt) / 1000));

    if (seconds < 60) {
        return `${seconds} detik lalu`;
    }

    return `${Math.floor(seconds / 60)} menit lalu`;
}

export default function PanicAlertOverlay({
    alert,
    onAcknowledge,
}: {
    alert: PanicAlert;
    onAcknowledge: (id: number) => void;
}) {
    const [now, setNow] = useState(() => Date.now());
    const [acking, setAcking] = useState(false);

    useSirenSound(!acking);

    useEffect(() => {
        const tick = setInterval(() => setNow(Date.now()), 1000);

        return () => clearInterval(tick);
    }, []);

    function handleAcknowledge() {
        if (acking) {
            return;
        }

        setAcking(true);

        // Dummy delay — swap for a real POST /security/alerts/:id/acknowledge
        // call once the backend endpoint exists.
        setTimeout(() => {
            onAcknowledge(alert.id);
        }, 500);
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-red-600 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
                <div className="relative flex h-24 w-24 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
                    <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/15">
                        <AlertOctagon className="h-10 w-10" />
                    </span>
                </div>

                <p className="mt-6 text-sm font-semibold tracking-widest text-white/80 uppercase">
                    Panic Alert
                </p>
                <p className="mt-1 text-2xl font-bold">{alert.unit}</p>

                <div className="mt-6 w-full max-w-xs space-y-3 rounded-2xl bg-white/10 p-4 text-left">
                    <InfoRow icon={User} value={alert.tenantName} />
                    <InfoRow icon={MapPin} value={alert.unit} />
                    <InfoRow
                        icon={Clock}
                        value={timeAgo(alert.triggeredAt, now)}
                    />
                </div>
            </div>

            <div className="px-6 pb-8">
                <Button
                    className="h-14 w-full bg-white text-base font-semibold text-red-600 hover:bg-white/90"
                    onClick={handleAcknowledge}
                    disabled={acking}
                >
                    {acking ? 'Memproses...' : 'Konfirmasi Diterima'}
                </Button>
                <p className="mt-3 text-center text-xs text-white/70">
                    Segera menuju lokasi. Alarm akan berhenti setelah
                    dikonfirmasi.
                </p>
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, value }: { icon: typeof User; value: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-4 w-4 shrink-0 text-white/70" />
            <span className="text-sm font-medium">{value}</span>
        </div>
    );
}
