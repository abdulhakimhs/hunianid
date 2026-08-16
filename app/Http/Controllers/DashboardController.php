<?php

namespace App\Http\Controllers;

use App\Models\AreaMember;
use App\Models\User;
use App\Services\MembershipContext;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $current = MembershipContext::current($user, $request);

        return Inertia::render('dashboard', [
            'guidance' => $current ? $this->guidanceFor($user, $current) : null,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Guidance is driven by whichever membership the user is currently viewing as (see
     * MembershipContext) — switching area/role in the nav menu changes what shows here.
     *
     * @return array<string, mixed>|null
     */
    private function guidanceFor(User $user, AreaMember $current): ?array
    {
        $area = $current->area;

        if ($current->role->key_name === 'superadmin' || $current->role->key_name === 'staff') {
            $hasActiveInvite = $area->invites()->where('status', 'active')->exists();

            if (! $hasActiveInvite) {
                return [
                    'type' => 'pengelola_new',
                    'areaId' => $area->id,
                    'areaName' => $area->name,
                ];
            }

            return null;
        }

        if ($current->role->key_name !== 'resident') {
            return null;
        }

        $inUnclaimedArea = $area->status === 'unclaimed';
        $pendingApproval = $current->status === 'pending_approval';
        $pendingUnitConfirmation = $user->units()->wherePivot('status', 'pending')->exists();

        if ($inUnclaimedArea && $pendingUnitConfirmation) {
            return ['type' => 'penghuni_unclaimed_and_pending_unit', 'areaId' => $area->id, 'areaName' => $area->name];
        }

        if ($inUnclaimedArea) {
            return ['type' => 'penghuni_unclaimed', 'areaId' => $area->id, 'areaName' => $area->name];
        }

        if ($pendingApproval && $pendingUnitConfirmation) {
            return ['type' => 'penghuni_pending_both', 'areaId' => $area->id, 'areaName' => $area->name];
        }

        if ($pendingApproval) {
            return ['type' => 'penghuni_pending_approval', 'areaId' => $area->id, 'areaName' => $area->name];
        }

        if ($pendingUnitConfirmation) {
            return ['type' => 'penghuni_pending_unit', 'areaId' => $area->id, 'areaName' => $area->name];
        }

        return null;
    }
}
