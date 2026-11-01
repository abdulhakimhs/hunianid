<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentGatewaySetting;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Services\MidtransService;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptions,
        private readonly MidtransService $midtrans,
    ) {}

    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');
        $subscription = $area->subscription?->load([
            'plan',
            'payments' => fn ($query) => $query->latest('id')->limit(5),
        ]);
        $gateway = PaymentGatewaySetting::current();

        return Inertia::render('admin/billing/index', [
            'subscription' => $subscription,
            'isActive' => $this->subscriptions->isActive($area),
            'plans' => Plan::where('is_self_service', true)->orderBy('sort_order')->get(),
            'midtransClientKey' => $gateway?->clientKey(),
            'midtransMode' => $gateway?->mode ?? 'sandbox',
        ]);
    }

    public function expired(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        return Inertia::render('admin/billing/expired', [
            'reason' => $area->subscription?->status ?? 'expired',
        ]);
    }

    public function checkout(Request $request)
    {
        $area = $request->attributes->get('adminArea');

        $data = $request->validate([
            'plan_id' => ['required', 'exists:plans,id'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
        ]);

        $plan = Plan::findOrFail($data['plan_id']);

        if (! $plan->is_self_service) {
            throw ValidationException::withMessages([
                'plan_id' => 'Paket ini tidak bisa dipilih langsung — silakan hubungi kami.',
            ]);
        }

        $subscription = $this->subscriptions->ensureSubscriptionAnchor($area, $plan);

        // Locks the subscription row for the duration of the checkout so two
        // concurrent requests (a double-click across plan buttons, two open
        // tabs) can't both pass the "supersede the existing pending payment"
        // check and leave two live pending payments behind.
        $result = DB::transaction(function () use ($subscription, $plan, $data, $request) {
            Subscription::where('id', $subscription->id)->lockForUpdate()->first();

            return $this->midtrans->createSnapTransaction($subscription, $plan, $data['billing_cycle'], $request->user());
        });

        if (! $result['ok']) {
            throw ValidationException::withMessages(['plan_id' => $result['error']]);
        }

        return response()->json($result);
    }

    /**
     * Called when the user closes the Snap popup without paying, so the
     * abandoned attempt is flagged promptly instead of only being caught
     * later by the subscriptions:expire-stale-payments sweep.
     */
    public function abandonCheckout(Request $request, SubscriptionPayment $payment)
    {
        $area = $request->attributes->get('adminArea');

        abort_unless($payment->subscription->area_id === $area->id, 404);

        if ($payment->isPending()) {
            $payment->update(['status' => SubscriptionPayment::STATUS_FAILED]);
        }

        return response()->noContent();
    }
}
