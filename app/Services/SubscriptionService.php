<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubscriptionService
{
    /**
     * Midtrans's default Snap transaction validity window — a pending payment
     * older than this is considered abandoned for good, not just "still being
     * paid slowly".
     */
    private const STALE_PAYMENT_HOURS = 24;
    /**
     * Starts a trial subscription for a newly-created pengelola area. Every
     * registration gets the same 30-day full-access trial regardless of
     * which plan was picked — $intendedPlan is only recorded on `plan_id` so
     * trial limits (maxUnits()) match the tier the admin intends to buy, and
     * the eventual invoice is for the right plan. Trial length itself always
     * comes off the canonical `trial` plan row, not the intended plan (whose
     * own trial_days may be null).
     */
    public function startTrial(Area $area, ?Plan $intendedPlan = null): Subscription
    {
        $trialPlan = Plan::where('key', 'trial')->first();

        if (! $trialPlan) {
            Log::warning('[subscription] no trial plan configured, skipping trial start', ['area_id' => $area->id]);

            throw new \RuntimeException('Paket trial belum dikonfigurasi.');
        }

        $trialDays = $trialPlan->trial_days ?? 30;

        return Subscription::create([
            'area_id' => $area->id,
            'plan_id' => ($intendedPlan ?? $trialPlan)->id,
            'billing_cycle' => 'trial',
            'status' => 'trialing',
            'trial_ends_at' => now()->addDays($trialDays),
        ]);
    }

    /**
     * No subscription row at all means this area predates the billing feature
     * (created directly, not through RegistrationService) — grandfathered in
     * as active rather than locked out, since there was never a trial for it
     * to expire.
     */
    public function isActive(Area $area): bool
    {
        $subscription = $area->subscription;

        if (! $subscription) {
            return true;
        }

        if ($subscription->status === 'active') {
            return true;
        }

        return $subscription->status === 'trialing'
            && $subscription->trial_ends_at
            && $subscription->trial_ends_at->isFuture();
    }

    /**
     * Returns the area's subscription row, creating a non-expiring placeholder
     * on the plan being checked out if none exists yet — needed as an anchor
     * for Midtrans's order_id/webhook flow. Deliberately NOT startTrial():
     * a legacy area with no subscription row is grandfathered as
     * always-active (see isActive()), and merely attempting a checkout must
     * never convert that into a real, expiring 30-day trial — or silently
     * shrink its unit limit to the trial plan's — before payment has
     * actually succeeded. Status stays 'active' until the webhook confirms
     * payment and sets the real billing period.
     */
    public function ensureSubscriptionAnchor(Area $area, Plan $plan): Subscription
    {
        if ($area->subscription) {
            return $area->subscription;
        }

        return Subscription::create([
            'area_id' => $area->id,
            'plan_id' => $plan->id,
            'billing_cycle' => 'trial',
            'status' => 'active',
        ]);
    }

    public function maxUnits(Area $area): ?int
    {
        return $area->subscription?->plan?->max_units;
    }

    public function canAddUnit(Area $area): bool
    {
        $maxUnits = $this->maxUnits($area);

        if ($maxUnits === null) {
            return true;
        }

        return $area->units()->count() < $maxUnits;
    }

    /**
     * Daily sweep — flips trials whose trial_ends_at has passed to `expired`.
     * The middleware's own live trial_ends_at check (see isActive()) is what
     * actually blocks access in real time between sweeps.
     */
    public function expireTrialsPastDue(): int
    {
        return Subscription::where('status', 'trialing')
            ->where('trial_ends_at', '<=', now())
            ->update(['status' => 'expired']);
    }

    /**
     * Marks every still-pending payment on the subscription as superseded,
     * except the one just created (if any) — called both when a new
     * checkout starts and by applyPaymentIfLatest() once a payment wins.
     */
    public function supersedePendingPayments(Subscription $subscription, ?int $exceptPaymentId = null): int
    {
        return $subscription->payments()
            ->pending()
            ->when($exceptPaymentId, fn ($query) => $query->where('id', '!=', $exceptPaymentId))
            ->update(['status' => SubscriptionPayment::STATUS_SUPERSEDED]);
    }

    /**
     * The idempotency guard: applies $payment's settlement to its subscription
     * only if no newer (higher-id) payment has already won for the same
     * subscription — so a stale/duplicate/out-of-order webhook for an
     * abandoned checkout can never downgrade a subscription that a later
     * payment already upgraded. Payment row id — not webhook arrival order —
     * decides who's authoritative, since rows are always created
     * synchronously at checkout time and order_id already encodes that order.
     *
     * Returns false (no-op) if the payment was already terminal, or has been
     * overtaken by a newer one (in which case it's marked superseded here).
     */
    public function applyPaymentIfLatest(SubscriptionPayment $payment): bool
    {
        return DB::transaction(function () use ($payment) {
            $subscription = Subscription::where('id', $payment->subscription_id)->lockForUpdate()->first();

            if (! $subscription || $payment->isTerminal()) {
                return false;
            }

            $overtaken = $subscription->payments()
                ->where('id', '>', $payment->id)
                ->whereIn('status', [SubscriptionPayment::STATUS_PENDING, SubscriptionPayment::STATUS_PAID])
                ->exists();

            if ($overtaken) {
                $payment->update(['status' => SubscriptionPayment::STATUS_SUPERSEDED]);

                Log::warning('[subscription] payment settled but overtaken by a newer payment', [
                    'payment_id' => $payment->id,
                    'subscription_id' => $subscription->id,
                ]);

                return false;
            }

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
                'payment_version' => $subscription->payment_version + 1,
            ]);

            $payment->update(['status' => SubscriptionPayment::STATUS_PAID, 'applied_at' => now()]);

            $this->supersedePendingPayments($subscription, exceptPaymentId: $payment->id);

            return true;
        });
    }

    /**
     * Safety-net sweep — real-time correctness comes from applyPaymentIfLatest()
     * above; this just stops payments the user simply never returned to from
     * showing as "pending" forever.
     */
    public function expireStalePendingPayments(): int
    {
        return SubscriptionPayment::pending()
            ->where('created_at', '<=', now()->subHours(self::STALE_PAYMENT_HOURS))
            ->update(['status' => SubscriptionPayment::STATUS_FAILED]);
    }

    public function changePlan(Area $area, Plan $plan, string $billingCycle): Subscription
    {
        $subscription = $area->subscription ?? new Subscription(['area_id' => $area->id]);

        $periodEnd = $billingCycle === 'yearly' ? now()->addYear() : now()->addMonth();

        $subscription->fill([
            'plan_id' => $plan->id,
            'billing_cycle' => $billingCycle,
            'status' => 'active',
            'current_period_starts_at' => now(),
            'current_period_ends_at' => $periodEnd,
            'canceled_at' => null,
        ])->save();

        return $subscription;
    }
}
