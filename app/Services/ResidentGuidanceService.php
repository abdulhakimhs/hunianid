<?php

namespace App\Services;

use App\Models\AreaMember;
use App\Models\User;

/**
 * What a resident (or family member) still has to resolve before their account
 * is fully usable, shown as a card on the tenant PWA home. Returns null when
 * nothing is pending. Pengelola-side guidance (setup checklist) lives in
 * DashboardController, since only superadmin/staff ever see the web dashboard.
 *
 * @return array{type: string, areaId?: int, areaName?: string}|null
 */
class ResidentGuidanceService
{
    public function for(User $user, ?AreaMember $membership): ?array
    {
        if ($user->profile_completed_at === null) {
            return ['type' => 'complete_profile'];
        }

        // Family members have no area membership (only a unit_user row), and
        // nothing else for them to resolve here.
        if (! $membership || $membership->role->key_name !== 'resident') {
            return null;
        }

        $area = $membership->area;

        $inUnclaimedArea = $area->status === 'unclaimed';
        // A resident with status === 'pending_approval' (outside an unclaimed area)
        // never reaches this code — the `pending.approval` middleware redirects them
        // to the dedicated waiting page before the tenant route resolves.
        $pendingUnitConfirmation = $user->units()->wherePivot('status', 'pending')->exists();

        $type = match (true) {
            $inUnclaimedArea && $pendingUnitConfirmation => 'penghuni_unclaimed_and_pending_unit',
            $inUnclaimedArea => 'penghuni_unclaimed',
            $pendingUnitConfirmation => 'penghuni_pending_unit',
            default => null,
        };

        return $type ? ['type' => $type, 'areaId' => $area->id, 'areaName' => $area->name] : null;
    }
}
