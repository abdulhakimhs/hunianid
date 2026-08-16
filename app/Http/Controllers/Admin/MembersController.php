<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MembersController extends Controller
{
    /**
     * GET /admin/members — full member list. Only the area's `created_by` user sees the
     * "Jadikan Pengurus" action, and only while the area is still unclaimed.
     */
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');
        $user = $request->user();

        $members = $area->areaMembers()
            ->with(['user:id,name,email,phone', 'role:id,key_name,label'])
            ->where('status', 'active')
            ->get()
            ->map(function ($m) use ($area) {
                $unit = Unit::where('area_id', $area->id)
                    ->whereHas('residents', fn ($q) => $q->where('users.id', $m->user_id)->where('unit_user.status', 'active'))
                    ->first(['id', 'block', 'unit_number']);

                return [
                    'id' => $m->id,
                    'user_id' => $m->user_id,
                    'name' => $m->user->name,
                    'email' => $m->user->email,
                    'phone' => $m->user->phone,
                    'role' => $m->role->key_name,
                    'roleLabel' => $m->role->label,
                    'joinedAt' => $m->created_at?->toIso8601String(),
                    'unit' => $unit ? trim(($unit->block ?? '').' '.$unit->unit_number) : null,
                ];
            });

        return Inertia::render('admin/members/index', [
            'members' => $members,
            'areaName' => $area->name,
            'canPromote' => $area->status === 'unclaimed' && $area->created_by === $user->id,
        ]);
    }
}
