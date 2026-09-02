<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Area;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        return Inertia::render('admin/settings/index', [
            'invitationMessage' => $area->invitation_message,
            'defaultInvitationMessage' => Area::DEFAULT_INVITATION_MESSAGE,
        ]);
    }

    public function update(Request $request)
    {
        $area = $request->attributes->get('adminArea');

        $data = $request->validate([
            'invitation_message' => ['nullable', 'string', 'max:1000'],
        ]);

        $area->update([
            'invitation_message' => $data['invitation_message'] ?: null,
        ]);

        return redirect()->route('admin.settings.index');
    }
}
