<?php

namespace App\Http\Controllers;

use App\Http\Requests\Settings\PasswordUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();

        $unit = $user->units()
            ->wherePivot('status', 'active')
            ->first(['units.id', 'units.unit_number', 'units.block']);

        return Inertia::render('tenant/profile', [
            'resident' => [
                'name' => $user->name,
                'unit' => $unit ? trim(($unit->block ? $unit->block.' ' : '').$unit->unit_number) : null,
                'phone' => $user->phone,
            ],
        ]);
    }

    public function updatePassword(PasswordUpdateRequest $request): RedirectResponse
    {
        $request->user()->update(['password' => $request->password]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Kata sandi berhasil diperbarui.')]);

        return to_route('tenant.profile');
    }
}
