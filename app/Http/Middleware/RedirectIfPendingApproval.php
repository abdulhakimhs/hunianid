<?php

namespace App\Http\Middleware;

use App\Services\MembershipContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfPendingApproval
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $current = MembershipContext::current($user, $request);

            // Unclaimed areas have no admin yet, so residents there are never
            // left in pending_approval — see RegistrationService::createUnclaimedArea.
            // This check stays defensive in case that ever changes.
            if (
                $current
                && $current->role->key_name === 'resident'
                && $current->status === 'pending_approval'
                && $current->area->status !== 'unclaimed'
            ) {
                return redirect()->route('pending-approval');
            }
        }

        return $next($request);
    }
}
