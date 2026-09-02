<?php

namespace App\Http\Middleware;

use App\Services\MembershipContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminRole
{
    private const SPECIAL_TOKENS = ['unclaimed_creator', 'area_without_admin'];

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        abort_unless($user, 403);

        $checkedRoles = array_diff($roles, self::SPECIAL_TOKENS);
        $current = MembershipContext::current($user, $request);

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

            if (in_array('unclaimed_creator', $roles, true) && MembershipContext::isUnclaimedCreator($current)) {
                $request->attributes->set('adminArea', $area);
                $request->attributes->set('adminMembership', $current);

                return $next($request);
            }

            if (in_array('area_without_admin', $roles, true) && MembershipContext::isAreaWithoutAdmin($current)) {
                $request->attributes->set('adminArea', $area);
                $request->attributes->set('adminMembership', $current);

                return $next($request);
            }
        }

        abort(403, 'Anda tidak memiliki akses admin di area yang sedang aktif. Beralihlah ke area/peran yang sesuai lewat menu profil Anda.');
    }
}
