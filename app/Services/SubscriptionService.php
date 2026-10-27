<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Support\Facades\Log;

class SubscriptionService
{
    /**
     * Starts a trial subscription for a newly-created pengelola area. Reads
     * trial length off the `plans` row (not hardcoded) so it stays
     * DB-editable, same spirit as the Midtrans key setup.
     */
    public function startTrial(Area $area): Subscription
    {
        $plan = Plan::where('key', 'trial')->first();

        if (! $plan) {
            Log::warning('[subscription] no trial plan configured, skipping trial start', ['area_id' => $area->id]);

            throw new \RuntimeException('Paket trial belum dikonfigurasi.');
        }

        $trialDays = $plan->trial_days ?? 30;

        return Subscription::create([
            'area_id' => $area->id,
            'plan_id' => $plan->id,
            'billing_cycle' => 'trial',
            'status' => 'trialing',
            'trial_ends_at' => now()->addDays($trialDays),
        ]);
    }

    /**
     * Starts a NEW pengelola area's subscription in `pending` — chosen a paid
     * plan at registration but hasn't paid yet. Deliberately NOT
     * ensureSubscriptionAnchor() (which anchors as `active` — correct only for
     * a pre-existing grandfathered area where "merely checking out" must not
     * newly lock out access that already existed). A brand-new area has never
     * had access, so it must stay locked (isActive() === false) until the
     * Midtrans webhook actually confirms payment and flips this to `active`.
     */
    public function startPendingCheckout(Area $area, Plan $plan): Subscription
    {
        return Subscription::create([
            'area_id' => $area->id,
            'plan_id' => $plan->id,
            'billing_cycle' => 'monthly',
            'status' => 'pending',
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
