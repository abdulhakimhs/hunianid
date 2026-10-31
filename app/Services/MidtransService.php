<?php

namespace App\Services;

use App\Models\PaymentGatewaySetting;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin wrapper around Midtrans's Snap + Notification API, following the same
 * raw-Http:: pattern as WaBlastService rather than pulling in an SDK — keeps
 * Sandbox/Production base-URL switching trivially DB-driven (see
 * PaymentGatewaySetting), matching how the user manages the keys themselves.
 */
class MidtransService
{
    public function createSnapTransaction(Subscription $subscription, Plan $plan, string $billingCycle, User $payer): array
    {
        $settings = PaymentGatewaySetting::current();

        if (! $settings || ! $settings->serverKey()) {
            Log::info('[midtrans] not configured, cannot create transaction', ['subscription_id' => $subscription->id]);

            return ['ok' => false, 'error' => 'Payment gateway belum dikonfigurasi.'];
        }

        $grossAmount = $billingCycle === 'yearly' ? $plan->price_yearly : $plan->price_monthly;
        $orderId = "SUB-{$subscription->id}-".now()->timestamp;

        $payment = SubscriptionPayment::create([
            'subscription_id' => $subscription->id,
            'order_id' => $orderId,
            'gross_amount' => $grossAmount,
            'billing_cycle' => $billingCycle,
        ]);

        try {
            $response = Http::withBasicAuth($settings->serverKey(), '')
                ->asJson()
                ->post("{$settings->baseUrl()}/snap/v1/transactions", [
                    'transaction_details' => [
                        'order_id' => $orderId,
                        'gross_amount' => $grossAmount,
                    ],
                    // The person actually paying (the admin clicking "Bayar Sekarang"),
                    // not the area's name — Midtrans uses first_name/email to address
                    // the payer directly in its own "Pembayaran sudah diterima" receipt
                    // email, so this previously showed "Dear {area name}" instead of
                    // the admin's own name.
                    'customer_details' => [
                        'first_name' => $payer->name,
                        'email' => $payer->email,
                        'phone' => $payer->phone,
                    ],
                    'item_details' => [[
                        'id' => "plan-{$plan->key}-{$billingCycle}",
                        'price' => $grossAmount,
                        'quantity' => 1,
                        'name' => "HunianID {$plan->name} ({$billingCycle})",
                    ]],
                ]);

            if ($response->successful()) {
                $payment->update(['snap_token' => $response->json('token')]);

                return [
                    'ok' => true,
                    'token' => $response->json('token'),
                    'redirect_url' => $response->json('redirect_url'),
                ];
            }

            return ['ok' => false, 'error' => $response->json('error_messages.0') ?? "HTTP {$response->status()}"];
        } catch (\Throwable $e) {
            Log::error('[midtrans] create transaction failed', ['order_id' => $orderId, 'exception' => $e->getMessage()]);

            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Verifies the Midtrans signature before trusting the webhook payload,
     * then applies the resulting status to the matching payment/subscription.
     *
     * @see https://docs.midtrans.com/docs/https-notification-webhooks
     */
    public function handleNotification(array $payload): void
    {
        $settings = PaymentGatewaySetting::current();

        if (! $settings || ! $settings->serverKey()) {
            Log::warning('[midtrans] notification received but gateway not configured');

            return;
        }

        $orderId = $payload['order_id'] ?? null;
        $statusCode = $payload['status_code'] ?? null;
        $grossAmount = $payload['gross_amount'] ?? null;
        $signatureKey = $payload['signature_key'] ?? null;

        if (! $orderId || ! $statusCode || ! $grossAmount || ! $signatureKey) {
            Log::warning('[midtrans] notification missing required fields', ['payload' => $payload]);

            return;
        }

        $expectedSignature = hash('sha512', $orderId.$statusCode.$grossAmount.$settings->serverKey());

        if (! hash_equals($expectedSignature, $signatureKey)) {
            Log::warning('[midtrans] notification signature mismatch', ['order_id' => $orderId]);

            return;
        }

        $payment = SubscriptionPayment::where('order_id', $orderId)->first();

        if (! $payment) {
            Log::warning('[midtrans] notification for unknown order_id', ['order_id' => $orderId]);

            return;
        }

        $transactionStatus = $payload['transaction_status'] ?? null;

        $payment->update([
            'midtrans_transaction_id' => $payload['transaction_id'] ?? null,
            'midtrans_transaction_status' => $transactionStatus,
            'payment_type' => $payload['payment_type'] ?? null,
            'raw_notification' => $payload,
        ]);

        if (in_array($transactionStatus, ['capture', 'settlement'], true)) {
            $payment->update(['paid_at' => now()]);

            $subscription = $payment->subscription;

            // Reward early payers: whatever trial time was left when they paid
            // gets added on top of the new paid period instead of being
            // discarded. Only applies while still trialing with time left —
            // reactivating an expired/past_due subscription gets no bonus.
            $remainingTrialSeconds = ($subscription->status === 'trialing' && $subscription->trial_ends_at?->isFuture())
                ? now()->diffInSeconds($subscription->trial_ends_at)
                : 0;

            $periodEnd = $payment->billing_cycle === 'yearly' ? now()->addYear() : now()->addMonth();
            $periodEnd = $periodEnd->addSeconds($remainingTrialSeconds);

            $subscription->update([
                'status' => 'active',
                'billing_cycle' => $payment->billing_cycle,
                'current_period_starts_at' => now(),
                'current_period_ends_at' => $periodEnd,
            ]);
        }
    }
}
