<?php

namespace App\Http\Controllers;

use App\Models\AreaMember;
use App\Models\User;
use App\Services\MembershipContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $current = MembershipContext::current($user, $request);

        if ($current && $current->role->key_name === 'security') {
            return redirect()->route('security.dashboard');
        }

        return Inertia::render('dashboard', [
            'guidance' => $current ? $this->guidanceFor($user, $current) : null,
            'status' => $request->session()->get('status'),
        ]);
    }

    private function guidanceFor(User $user, AreaMember $current): ?array
    {
        if ($user->profile_completed_at === null) {
            return ['type' => 'complete_profile'];
        }

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
