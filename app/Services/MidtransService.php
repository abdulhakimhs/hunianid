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
    public function __construct(
        private readonly SubscriptionService $subscriptions,
    ) {}

    public function createSnapTransaction(Subscription $subscription, Plan $plan, string $billingCycle, User $payer): array
    {
        $settings = PaymentGatewaySetting::current();

        if (! $settings || ! $settings->serverKey()) {
            Log::info('[midtrans] not configured, cannot create transaction', ['subscription_id' => $subscription->id]);

            return ['ok' => false, 'error' => 'Payment gateway belum dikonfigurasi.'];
        }

        // Starting a new checkout always supersedes any existing pending one —
        // re-clicking any plan button is always safe and always represents
        // the user's current intent, no separate "resume vs cancel" flow.
        $previousPending = $subscription->latestPendingPayment();

        if ($previousPending) {
            if ($previousPending->snap_token) {
                $this->cancelTransaction($settings, $previousPending->order_id);
            }

            $this->subscriptions->supersedePendingPayments($subscription);
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
                    'payment_id' => $payment->id,
                ];
            }

            return ['ok' => false, 'error' => $response->json('error_messages.0') ?? "HTTP {$response->status()}"];
        } catch (\Throwable $e) {
            Log::error('[midtrans] create transaction failed', ['order_id' => $orderId, 'exception' => $e->getMessage()]);

            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Best-effort: tells Midtrans to invalidate a superseded Snap token so the
     * stale checkout link stops being payable. Never blocks the new checkout
     * on failure — if the old transaction is already final (e.g. the user
     * actually paid it in the background) Midtrans's own cancel API errors,
     * which is fine to ignore; applyPaymentIfLatest() is the real defense.
     */
    private function cancelTransaction(PaymentGatewaySetting $settings, string $orderId): void
    {
        try {
            Http::withBasicAuth($settings->serverKey(), '')
                ->asJson()
                ->post("{$settings->baseUrl()}/v2/{$orderId}/cancel");
        } catch (\Throwable $e) {
            Log::warning('[midtrans] cancel superseded transaction failed', ['order_id' => $orderId, 'exception' => $e->getMessage()]);
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

            // Only applies the settlement if no newer payment has already won
            // for this subscription — guards against a stale/duplicate/
            // out-of-order webhook (e.g. for an abandoned checkout) silently
            // overwriting a subscription a later payment already upgraded.
            $this->subscriptions->applyPaymentIfLatest($payment->refresh());
        } elseif (in_array($transactionStatus, ['deny', 'cancel', 'expire', 'failure'], true)) {
            if ($payment->isPending()) {
                $payment->update(['status' => SubscriptionPayment::STATUS_FAILED]);
            }
        }
    }
}
