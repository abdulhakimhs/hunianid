<?php

namespace App\Http\Middleware;

use App\Models\AreaMember;
use App\Models\User;
use App\Services\MembershipContext;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    public function __construct(
        private readonly SubscriptionService $subscriptions,
    ) {}

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

                'adminAccess' => $this->adminAccess($current),

                'pendingJoinRequestsCount' => $user ? $this->pendingJoinRequestsCount($user) : 0,
            ],
            'subscription' => $this->subscriptionStatus($current),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * How many people are waiting on this user to confirm/decline them joining one
     * of their active units (unit_user status=pending). Drives the sidebar badge.
     */
    private function pendingJoinRequestsCount(User $user): int
    {
        $unitIds = $user->units()->wherePivot('status', 'active')->pluck('units.id');

        if ($unitIds->isEmpty()) {
            return 0;
        }

        return DB::table('unit_user')
            ->whereIn('unit_id', $unitIds)
            ->where('status', 'pending')
            ->count();
    }

    /**
     * Drives the top-of-app upsell banner. Null when the current membership
     * isn't an admin of an area at all (resident/security PWAs don't carry
     * their own area's subscription state).
     *
     * @return array{status: string, trialEndsAt: ?string, daysLeft: ?int}|null
     */
    private function subscriptionStatus(?AreaMember $current): ?array
    {
        if (! $current || ! in_array($current->role->key_name, ['superadmin', 'staff'], true)) {
            return null;
        }

        $subscription = $current->area->subscription;

        if (! $subscription) {
            return null;
        }

        $daysLeft = $subscription->trial_ends_at
            ? max(0, (int) now()->diffInDays($subscription->trial_ends_at, false))
            : null;

        return [
            'status' => $subscription->status,
            'trialEndsAt' => $subscription->trial_ends_at?->toIso8601String(),
            'daysLeft' => $daysLeft,
        ];
    }

    /**
     * @return array{members: bool, invites: bool, pendingApprovals: bool, settings: bool, families: bool, security: bool, invoices: bool, announcements: bool, staffManagement: bool, visitorPasses: bool, tickets: bool}
     */
    private function adminAccess(?AreaMember $current): array
    {
        $none = ['members' => false, 'invites' => false, 'pendingApprovals' => false, 'settings' => false, 'families' => false, 'security' => false, 'invoices' => false, 'announcements' => false, 'staffManagement' => false, 'visitorPasses' => false, 'tickets' => false];

        if (! $current || $current->status !== 'active') {
            return $none;
        }

        if (in_array($current->role->key_name, ['superadmin', 'staff'], true)) {
            return [
                'members' => true, 'invites' => true, 'pendingApprovals' => true, 'settings' => true,
                'families' => true, 'security' => true, 'invoices' => true, 'announcements' => true,
                // Staff RT management stays superadmin-only — unlike every other flag
                // here, `staff` itself is deliberately excluded so staff can't add more
                // staff accounts.
                'staffManagement' => $current->role->key_name === 'superadmin',
                'visitorPasses' => true,
                // Same gate as invoices — superadmin/staff only, not the broader
                // unclaimed_creator/area_without_admin groups below.
                'tickets' => true,
            ];
        }

        // families/security/announcements/visitorPasses mirror members: same admin.role
        // gate (superadmin, staff, unclaimed_creator). invoices is deliberately NOT
        // granted here — invoicing/payment status stays superadmin/staff-only, unlike
        // the setup actions below. staffManagement is never granted outside the
        // superadmin branch.
        $isUnclaimedCreator = MembershipContext::isUnclaimedCreator($current);

        return [
            'members' => $isUnclaimedCreator,
            'invites' => MembershipContext::isAreaWithoutAdmin($current),
            'pendingApprovals' => false,
            'settings' => false,
            'families' => $isUnclaimedCreator,
            'security' => $isUnclaimedCreator,
            'invoices' => false,
            'announcements' => $isUnclaimedCreator,
            'staffManagement' => false,
            'visitorPasses' => $isUnclaimedCreator,
            'tickets' => false,
        ];
    }
}
