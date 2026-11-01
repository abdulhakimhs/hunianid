<?php

namespace App\Console\Commands;

use App\Services\SubscriptionService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('subscriptions:expire-stale-payments')]
#[Description('Mark pending subscription payments older than the Snap token validity window as failed')]
class ExpireStalePendingPayments extends Command
{
    public function handle(SubscriptionService $subscriptions): void
    {
        $count = $subscriptions->expireStalePendingPayments();

        $this->info("Expired {$count} stale pending payment(s).");
    }
}
