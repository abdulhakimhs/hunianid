<?php

namespace App\Http\Middleware;

use App\Services\MembershipContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminRole
{
    /**
     * Special role tokens that don't correspond to an actual `roles.key_name` — handled
     * separately below rather than checked against the membership's own role.
     */
    private const SPECIAL_TOKENS = ['unclaimed_creator', 'area_without_admin'];

    /**
     * Ensures the area/role the user is currently viewing as (see MembershipContext)
     * qualifies for one of the given roles, and makes that area available as
     * $request->adminArea. Scoped strictly to the currently selected membership — never
     * falls back to a different area where the user happens to hold an admin role.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        abort_unless($user, 403);

        $checkedRoles = array_diff($roles, self::SPECIAL_TOKENS);
        $current = MembershipContext::current($user, $request);

        // current() can return a pending_approval row (for dashboard display) — that
        // never grants admin access on its own.
        if ($current && $current->status !== 'active') {
            abort(403, 'Anda tidak memiliki akses admin di area yang sedang aktif. Beralihlah ke area/peran yang sesuai lewat menu profil Anda.');
        }

        if ($current && $checkedRoles && in_array($current->role->key_name, $checkedRoles, true)) {
            $request->attributes->set('adminArea', $current->area);
            $request->attributes->set('adminMembership', $current);

            return $next($request);
        }

        if ($current && $current->role->key_name === 'resident') {
            $area = $current->area;

            // The resident who founded an unclaimed area may act as its admin until
            // it's actually claimed.
            if (in_array('unclaimed_creator', $roles, true) && MembershipContext::isUnclaimedCreator($current)) {
                $request->attributes->set('adminArea', $area);
                $request->attributes->set('adminMembership', $current);

                return $next($request);
            }

            // Any resident may generate invites for their own area as long as it has
            // no superadmin/staff yet — closes once one exists.
            if (in_array('area_without_admin', $roles, true) && MembershipContext::isAreaWithoutAdmin($current)) {
                $request->attributes->set('adminArea', $area);
                $request->attributes->set('adminMembership', $current);

                return $next($request);
            }
        }

        abort(403, 'Anda tidak memiliki akses admin di area yang sedang aktif. Beralihlah ke area/peran yang sesuai lewat menu profil Anda.');
    }
}
