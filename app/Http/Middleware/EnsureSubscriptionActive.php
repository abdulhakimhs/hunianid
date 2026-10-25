<?php

namespace App\Http\Middleware;

use App\Services\SubscriptionService;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Runs after EnsureAdminRole (which sets `adminArea`) on feature routes —
 * invoices, tickets, visitor passes, announcements, staff/security
 * management. The billing page itself stays outside this middleware so an
 * expired admin can still see the upsell screen and pay.
 */
class EnsureSubscriptionActive
{
    public function __construct(
        private readonly SubscriptionService $subscriptions,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $area = $request->attributes->get('adminArea');

        if ($area && ! $this->subscriptions->isActive($area)) {
            return Inertia::render('admin/billing/expired')->toResponse($request);
        }

        return $next($request);
    }
}
