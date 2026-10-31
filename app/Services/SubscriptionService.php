<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Support\Facades\Log;

class SubscriptionService
{
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
