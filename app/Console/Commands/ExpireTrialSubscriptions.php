<?php

namespace App\Console\Commands;

use App\Services\SubscriptionService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('subscriptions:expire-trials')]
#[Description('Flip trialing subscriptions whose trial_ends_at has passed to expired')]
class ExpireTrialSubscriptions extends Command
{
    public function handle(SubscriptionService $subscriptions): void
    {
        $count = $subscriptions->expireTrialsPastDue();

        $this->info("Expired {$count} trial subscription(s).");
    }
}
