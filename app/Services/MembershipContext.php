<?php

namespace App\Services;

use App\Models\AreaMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Resolves which of a user's `area_members` rows is their "current" one — the
 * area/role they're currently viewing the app as. Persisted in session (per login)
 * and on `users.last_membership_id` (survives logout).
 */
class MembershipContext
{
    public const SESSION_KEY = 'current_membership_id';

    /**
     * Role priority, most privileged first. Used to pick a sensible default and to
     * order memberships so a per-area lookup resolves to the admin role rather than an
     * incidental resident row with a lower id (the unclaimed-area handover flow adds a
     * superadmin row on top of an existing resident row for the same person/area).
     */
    private const ROLE_PRIORITY = ['superadmin' => 0, 'staff' => 1, 'security' => 2, 'resident' => 3];

    /**
     * Active memberships only — the strict list for access control (nav switcher,
     * EnsureAdminRole's route scoping). A pending_approval row grants nothing.
     *
     * @return Collection<int, AreaMember>
     */
    public static function activeMemberships(User $user): Collection
    {
        return self::membershipsWithStatuses($user, ['active']);
    }

    /**
     * Active + pending_approval — for display only (dashboard guidance, nav menu
     * subtitle), never for access control. Keeps a user whose only membership is still
     * pending from having no "current" context at all.
     *
     * @return Collection<int, AreaMember>
     */
    public static function visibleMemberships(User $user): Collection
    {
        return self::membershipsWithStatuses($user, ['active', 'pending_approval']);
    }

    /**
     * @param  array<int, string>  $statuses
     * @return Collection<int, AreaMember>
     */
    private static function membershipsWithStatuses(User $user, array $statuses): Collection
    {
        return $user->areaMemberships()
            ->whereIn('status', $statuses)
            ->with(['area:id,complex_id,name,status,created_by', 'area.complex:id,name', 'role:id,key_name,label'])
            ->get()
            ->sortBy(fn (AreaMember $m) => self::ROLE_PRIORITY[$m->role->key_name] ?? 9)
            ->values();
    }

    public static function current(User $user, Request $request): ?AreaMember
    {
        $memberships = self::visibleMemberships($user);

        if ($memberships->isEmpty()) {
            return null;
        }

        // Explicit choice for this request wins; otherwise restore the last one picked.
        $selectedId = $request->session()->get(self::SESSION_KEY) ?? $user->last_membership_id;

        if ($selectedId) {
            $selected = $memberships->firstWhere('id', $selectedId);

            if ($selected) {
                return $selected;
            }
        }

        // No choice yet (or a stale one) — default to the most privileged active
        // membership; pending is only ever the default when nothing active exists.
        return $memberships->first(fn (AreaMember $m) => $m->status === 'active') ?? $memberships->first();
    }

    public static function select(Request $request, AreaMember $membership): void
    {
        $request->session()->put(self::SESSION_KEY, $membership->id);

        User::whereKey($membership->user_id)->update(['last_membership_id' => $membership->id]);
    }

    /**
     * Whether $membership is the resident who founded an as-yet-unclaimed area — the
     * one case where a plain resident may act as its admin. Shared between
     * EnsureAdminRole and HandleInertiaRequests so the gate and the UI stay in sync.
     */
    public static function isUnclaimedCreator(AreaMember $membership): bool
    {
        $area = $membership->area;

        return $membership->role->key_name === 'resident'
            && $area->status === 'unclaimed'
            && $area->created_by === $membership->user_id;
    }

    /**
     * Whether $membership's area currently has no active superadmin/staff — the case
     * where any resident may generate invites for it.
     */
    public static function isAreaWithoutAdmin(AreaMember $membership): bool
    {
        if ($membership->role->key_name !== 'resident') {
            return false;
        }

        return ! $membership->area->areaMembers()
            ->whereHas('role', fn ($q) => $q->whereIn('key_name', ['superadmin', 'staff']))
            ->where('status', 'active')
            ->exists();
    }
}
