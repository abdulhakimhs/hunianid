<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Services\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionPaymentIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    private function makeSubscription(): Subscription
    {
        $area = Area::factory()->create();
        $plan = Plan::create([
            'key' => 'standard-test-'.uniqid(),
            'name' => 'Standard',
            'max_units' => 150,
            'price_monthly' => 100_000,
            'price_yearly' => 1_000_000,
            'is_self_service' => true,
            'sort_order' => 1,
        ]);

        return Subscription::create([
            'area_id' => $area->id,
            'plan_id' => $plan->id,
            'billing_cycle' => 'trial',
            'status' => 'trialing',
            'trial_ends_at' => now()->addDays(10),
        ]);
    }

    private function makePayment(Subscription $subscription, string $cycle): SubscriptionPayment
    {
        return SubscriptionPayment::create([
            'subscription_id' => $subscription->id,
            'order_id' => "SUB-{$subscription->id}-".now()->timestamp.'-'.random_int(1000, 9999),
            'gross_amount' => $cycle === 'yearly' ? 1_000_000 : 100_000,
            'billing_cycle' => $cycle,
        ]);
    }

    public function test_later_payment_wins_and_earlier_one_is_superseded(): void
    {
        $service = app(SubscriptionService::class);
        $subscription = $this->makeSubscription();

        $paymentA = $this->makePayment($subscription, 'monthly');
        $paymentB = $this->makePayment($subscription, 'yearly');

        $this->assertTrue($service->applyPaymentIfLatest($paymentB->fresh()));

        $subscription->refresh();
        $this->assertSame('active', $subscription->status);
        $this->assertSame('yearly', $subscription->billing_cycle);
        $this->assertSame(1, $subscription->payment_version);

        // Stale webhook for the earlier, abandoned payment arrives after the
        // real (later) one already won — must not downgrade the subscription.
        $applied = $service->applyPaymentIfLatest($paymentA->fresh());

        $this->assertFalse($applied);
        $subscription->refresh();
        $this->assertSame('active', $subscription->status);
        $this->assertSame('yearly', $subscription->billing_cycle, 'stale webhook must not downgrade billing cycle');
        $this->assertSame(1, $subscription->payment_version, 'stale webhook must not bump payment_version');

        $this->assertSame(SubscriptionPayment::STATUS_SUPERSEDED, $paymentA->fresh()->status);
        $this->assertSame(SubscriptionPayment::STATUS_PAID, $paymentB->fresh()->status);
    }

    public function test_reapplying_an_already_paid_payment_is_a_no_op(): void
    {
        $service = app(SubscriptionService::class);
        $subscription = $this->makeSubscription();
        $payment = $this->makePayment($subscription, 'monthly');

        $this->assertTrue($service->applyPaymentIfLatest($payment->fresh()));

        $periodEndAfterFirstApply = $subscription->fresh()->current_period_ends_at;

        // Midtrans retrying the same notification a second time.
        $applied = $service->applyPaymentIfLatest($payment->fresh());

        $this->assertFalse($applied);
        $subscription->refresh();
        $this->assertSame(1, $subscription->payment_version, 'retry must not double-apply');
        $this->assertEquals($periodEndAfterFirstApply, $subscription->current_period_ends_at);
    }

    public function test_apply_carries_over_remaining_trial_seconds(): void
    {
        $service = app(SubscriptionService::class);
        $subscription = $this->makeSubscription(); // trialing, 10 days left
        $payment = $this->makePayment($subscription, 'monthly');

        $service->applyPaymentIfLatest($payment->fresh());

        $subscription->refresh();
        // ~1 month + ~10 days, allow a few seconds of test-execution drift.
        $expected = now()->addMonth()->addDays(10);
        $this->assertTrue(
            $subscription->current_period_ends_at->diffInSeconds($expected) < 5,
            'expected period end to include leftover trial days',
        );
    }

    public function test_starting_a_new_checkout_supersedes_the_old_pending_payment(): void
    {
        $service = app(SubscriptionService::class);
        $subscription = $this->makeSubscription();

        $old = $this->makePayment($subscription, 'monthly');
        $this->assertSame(SubscriptionPayment::STATUS_PENDING, $old->fresh()->status);

        $service->supersedePendingPayments($subscription);

        $this->assertSame(SubscriptionPayment::STATUS_SUPERSEDED, $old->fresh()->status);
    }
}
