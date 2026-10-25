<?php

namespace App\Services;

use App\Models\AreaMember;
use App\Models\PanicAlert;

/**
 * Pushes a device notification to every active security guard in the alert's
 * area — a real push notification, not WhatsApp, so a guard is alerted even
 * with the app closed/backgrounded. Mirrors TicketNotificationService's
 * area-admin query, just filtered to the security role instead.
 */
class PanicNotificationService
{
    public function __construct(
        private readonly WebPushService $webPush,
    ) {}

    public function notifySecurityOfPanic(PanicAlert $alert): void
    {
        $alert->loadMissing(['unit', 'user']);

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
    }
}
