<?php

namespace App\Services;

use App\Models\AreaMember;
use App\Models\PanicAlert;

use function Illuminate\Support\defer;

/**
 * Alerts every active security guard in the alert's area two ways: a device
 * push notification (reaches a guard even with the app closed/backgrounded)
 * and a WhatsApp message (reaches a guard whose push subscription is missing
 * or whose phone has the PWA notifications muted). Mirrors
 * TicketNotificationService's area-admin query, filtered to the security role.
 */
class PanicNotificationService
{
    private const REASON_LABELS = [
        'medical' => 'Medis',
        'security' => 'Keamanan',
        'fire' => 'Kebakaran',
        'other' => 'Lainnya',
    ];

    public function __construct(
        private readonly WebPushService $webPush,
        private readonly WaBlastService $waBlast,
    ) {}

    public function notifySecurityOfPanic(PanicAlert $alert): void
    {
        $alert->loadMissing(['unit', 'user', 'area']);

        $unitLabel = trim(($alert->unit->block ?? '').' '.$alert->unit->unit_number);

        $payload = [
            'title' => '🚨 Keadaan Darurat',
            'body' => "Ada keadaan darurat dilaporkan di {$unitLabel}",
            'data' => [
                'url' => '/security',
                'alertId' => $alert->id,
                'unit' => $unitLabel,
                'tenantName' => $alert->user->name,
                'triggeredAt' => $alert->created_at->timestamp * 1000,
            ],
        ];

        $guards = AreaMember::where('area_id', $alert->area_id)
            ->where('status', 'active')
            ->whereHas('role', fn ($q) => $q->whereIn('key_name', ['security']))
            ->with('user.pushSubscriptions')
            ->get();

        foreach ($guards as $guard) {
            foreach ($guard->user->pushSubscriptions as $subscription) {
                $this->webPush->sendTo($subscription, $payload);
            }
        }

        $message = $this->whatsappMessage($alert, $unitLabel);
        $phones = $guards->map(fn (AreaMember $guard) => $guard->user->phone)->filter()->unique()->values();

        // Deferred until after the response is sent: each Wablas call is a
        // synchronous HTTP request (no queue worker in prod), and the tenant's
        // panic request shouldn't wait on N of them. send() never throws.
        defer(function () use ($phones, $message) {
            foreach ($phones as $phone) {
                $this->waBlast->send($phone, $message);
            }
        });
    }

    private function whatsappMessage(PanicAlert $alert, string $unitLabel): string
    {
        $reason = self::REASON_LABELS[$alert->reason] ?? null;
        $reporter = $alert->user->name.($reason ? " ({$reason})" : '');
        $time = $alert->created_at->timezone('Asia/Jakarta')->format('H:i').' WIB';
        $url = rtrim(config('app.url'), '/').'/security';

        return "🚨 *DARURAT* — {$unitLabel}, {$alert->area->name}.\n"
            ."Dilaporkan oleh {$reporter} pukul {$time}.\n\n"
            ."Segera cek aplikasi Keamanan: {$url}";
    }
}
