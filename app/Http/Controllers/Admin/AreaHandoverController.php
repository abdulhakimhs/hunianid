<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AreaMember;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AreaHandoverController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'area_member_id' => ['required', 'integer', 'exists:area_members,id'],
            'type' => ['required', Rule::in(['rt_rw', 'developer'])],
        ]);

        $target = AreaMember::with(['area', 'user:id,name'])->findOrFail($data['area_member_id']);
        $area = $target->area;

        abort_unless($area->created_by === $request->user()->id, 403, 'Hanya pembuat area ini yang bisa menyerahkan akses pengelola.');
        abort_unless($area->status === 'unclaimed', 422, 'Area ini sudah memiliki pengurus.');

        DB::transaction(function () use ($area, $target, $data) {
            $area->update(['type' => $data['type'], 'status' => 'active']);

            AreaMember::firstOrCreate(
                [
                    'area_id' => $area->id,
                    'user_id' => $target->user_id,
                    'role_id' => Role::where('key_name', 'superadmin')->value('id'),
                ],
                [
                    'status' => 'active',
                    'approved_by' => $target->user_id,
                    'approved_at' => now(),
                ],
            );
        });

        return redirect()->route('dashboard')->with('status', "Berhasil menyerahkan akses pengelola kepada {$target->user->name}.");
    }
}
