<?php

namespace App\Services;

use App\Models\Subscription;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class SubscriptionReminderService
{
    private const THRESHOLDS = [7, 3, 2, 1];

    /**
     * Trialing subscriptions whose trial_ends_at is exactly 7, 3, 2, or 1
     * day(s) away and that haven't already been reminded today.
     *
     * @return Collection<int, Subscription>
     */
    public function findDue(): Collection
    {
        $today = Carbon::today();

        return Subscription::where('status', 'trialing')
            ->whereNotNull('trial_ends_at')
            ->with('area', 'plan')
            ->get()
            ->filter(function (Subscription $subscription) use ($today) {
                if ($subscription->trial_reminder_sent_at && $subscription->trial_reminder_sent_at->isSameDay($today)) {
                    return false;
                }

                $daysLeft = $today->diffInDays($subscription->trial_ends_at->copy()->startOfDay(), false);

                return in_array($daysLeft, self::THRESHOLDS, true);
            })
            ->values();
    }
}
