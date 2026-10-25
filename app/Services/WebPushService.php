<?php

namespace App\Services;

use App\Models\PushSubscription;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushService
{
    private WebPush $webPush;

    public function __construct()
    {
        $this->webPush = new WebPush([
            'VAPID' => [
                'subject' => config('services.vapid.subject'),
                'publicKey' => config('services.vapid.public_key'),
                'privateKey' => config('services.vapid.private_key'),
            ],
        ]);
    }

    public function sendTo(PushSubscription $subscription, array $payload): void
    {
        $sub = Subscription::create([
            'endpoint' => $subscription->endpoint,
            'keys' => ['p256dh' => $subscription->p256dh, 'auth' => $subscription->auth],
        ]);

        try {
            $report = $this->webPush->sendOneNotification($sub, json_encode($payload));

            if (! $report->isSuccess()) {
                if ($report->isSubscriptionExpired()) {
                    $subscription->delete();

                    return;
                }

                Log::error('[web-push] send failed', [
                    'subscription_id' => $subscription->id,
                    'reason' => $report->getReason(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('[web-push] send threw', [
                'subscription_id' => $subscription->id,
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
