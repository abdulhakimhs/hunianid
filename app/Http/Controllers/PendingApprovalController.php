<?php

namespace App\Http\Controllers;

use App\Services\MembershipContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PendingApprovalController extends Controller
{
    public function __invoke(Request $request): Response|RedirectResponse
    {
        $current = MembershipContext::current($request->user(), $request);

        // This route isn't gated by `pending.approval` (it's the redirect target for
        // that middleware), so an already-approved user who hits the URL directly
        // would otherwise see a false "waiting for approval" message with their real
        // area name — bounce them to the dashboard instead.
        if (! $current || $current->status !== 'pending_approval') {
            return redirect()->route('dashboard');
        }

        return Inertia::render('pending-approval', [
            'areaName' => $current->area->name,
        ]);
    }
}
