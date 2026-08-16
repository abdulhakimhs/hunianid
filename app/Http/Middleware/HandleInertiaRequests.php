<?php

namespace App\Http\Middleware;

use App\Models\AreaMember;
use App\Services\MembershipContext;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        $memberships = $user ? MembershipContext::activeMemberships($user) : collect();
        $current = $user ? MembershipContext::current($user, $request) : null;

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'memberships' => $memberships->map(fn ($m) => [
                    'id' => $m->id,
                    'areaId' => $m->area_id,
                    'areaName' => $m->area->name,
                    'complexName' => $m->area->complex->name,
                    'roleKey' => $m->role->key_name,
                    'roleLabel' => $m->role->label,
                ])->values(),
                'currentMembershipId' => $current?->id,
                // Drives which admin nav links the sidebar shows — backed by the same
                // MembershipContext helpers EnsureAdminRole gates on.
                'adminAccess' => $this->adminAccess($current),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * @return array{members: bool, invites: bool, pendingApprovals: bool}
     */
    private function adminAccess(?AreaMember $current): array
    {
        $none = ['members' => false, 'invites' => false, 'pendingApprovals' => false];

        if (! $current || $current->status !== 'active') {
            return $none;
        }

        if (in_array($current->role->key_name, ['superadmin', 'staff'], true)) {
            return ['members' => true, 'invites' => true, 'pendingApprovals' => true];
        }

        return [
            'members' => MembershipContext::isUnclaimedCreator($current),
            'invites' => MembershipContext::isAreaWithoutAdmin($current),
            'pendingApprovals' => false,
        ];
    }
}
