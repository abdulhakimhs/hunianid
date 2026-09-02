<?php

namespace App\Services;

use App\Models\AreaMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class MembershipContext
{
    public const SESSION_KEY = 'current_membership_id';

    private const ROLE_PRIORITY = ['superadmin' => 0, 'staff' => 1, 'security' => 2, 'resident' => 3];

    public static function activeMemberships(User $user): Collection
    {
        return self::membershipsWithStatuses($user, ['active']);
    }

    public static function visibleMemberships(User $user): Collection
    {
        return self::membershipsWithStatuses($user, ['active', 'pending_approval']);
    }

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

        $selectedId = $request->session()->get(self::SESSION_KEY) ?? $user->last_membership_id;

        if ($selectedId) {
            $selected = $memberships->firstWhere('id', $selectedId);

            if ($selected) {
                return $selected;
            }
        }

        return $memberships->first(fn (AreaMember $m) => $m->status === 'active') ?? $memberships->first();
    }

    public static function select(Request $request, AreaMember $membership): void
    {
        $request->session()->put(self::SESSION_KEY, $membership->id);

        User::whereKey($membership->user_id)->update(['last_membership_id' => $membership->id]);
    }

    public static function isUnclaimedCreator(AreaMember $membership): bool
    {
        $area = $membership->area;

        return $membership->role->key_name === 'resident'
            && $area->status === 'unclaimed'
            && $area->created_by === $membership->user_id;
    }

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
