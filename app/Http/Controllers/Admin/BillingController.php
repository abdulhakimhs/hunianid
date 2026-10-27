<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentGatewaySetting;
use App\Models\Plan;
use App\Services\MidtransService;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
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
        $subscription = $area->subscription?->load('plan');
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

        $result = $this->midtrans->createSnapTransaction($subscription, $plan, $data['billing_cycle']);

        if (! $result['ok']) {
            throw ValidationException::withMessages(['plan_id' => $result['error']]);
        }

        return response()->json($result);
    }
}
