<?php

namespace App\Http\Controllers\Security;

use App\Http\Controllers\Controller;
use App\Http\Requests\Security\UpdateSecurityProfileRequest;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        $membership = $request->attributes->get('adminMembership');
        $area = $request->attributes->get('adminArea');
        $user = $request->user();

        return Inertia::render('security/profile', [
            'guard' => [
                'name' => $user->name,
                'phone' => $user->phone,
                'roleLabel' => $membership->role->label,
                'areaLabel' => "{$area->complex->name}-{$area->name}",
                'joinedAt' => ($membership->approved_at ?? $membership->created_at)->translatedFormat('F Y'),
            ],
        ]);
    }

    public function update(UpdateSecurityProfileRequest $request): RedirectResponse
    {
        $request->user()->update(['name' => $request->validated('name')]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profil berhasil diperbarui.')]);

        return to_route('security.profile');
    }

    public function updatePassword(PasswordUpdateRequest $request): RedirectResponse
    {
        $request->user()->update(['password' => $request->password]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Kata sandi berhasil diperbarui.')]);

        return to_route('security.profile');
    }
}
