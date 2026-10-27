<?php

namespace Tests\Feature;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PushSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_a_push_subscription(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/push-subscriptions', [
                'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
                'keys' => ['p256dh' => 'p256dh-value', 'auth' => 'auth-value'],
            ])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertSame(1, PushSubscription::count());
        $subscription = PushSubscription::first();
        $this->assertSame($user->id, $subscription->user_id);
        $this->assertSame('https://fcm.googleapis.com/fcm/send/abc123', $subscription->endpoint);
    }

    public function test_resubscribing_the_same_endpoint_updates_rather_than_duplicates(): void
    {
        $user = User::factory()->create();

        PushSubscription::create([
            'user_id' => $user->id,
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
            'p256dh' => 'old-key',
            'auth' => 'old-auth',
        ]);

        $this->actingAs($user)->postJson('/push-subscriptions', [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
            'keys' => ['p256dh' => 'new-key', 'auth' => 'new-auth'],
        ])->assertOk();

        $this->assertSame(1, PushSubscription::count());
        $this->assertSame('new-key', PushSubscription::first()->p256dh);
    }

    public function test_user_can_only_delete_their_own_subscription(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $subscription = PushSubscription::create([
            'user_id' => $owner->id,
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
            'p256dh' => 'key',
            'auth' => 'auth',
        ]);

        $this->actingAs($other)->deleteJson('/push-subscriptions', [
            'endpoint' => $subscription->endpoint,
        ])->assertOk();

        $this->assertSame(1, PushSubscription::count(), 'another user must not be able to delete someone else\'s subscription');

        $this->actingAs($owner)->deleteJson('/push-subscriptions', [
            'endpoint' => $subscription->endpoint,
        ])->assertOk();

        $this->assertSame(0, PushSubscription::count());
    }
}
