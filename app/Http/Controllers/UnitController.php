<?php

namespace App\Http\Controllers;

use App\Services\FamilyService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller
{
    public function __construct(private readonly FamilyService $families) {}

    public function show(Request $request): Response
    {
        $user = $request->user();
        $familyMembers = $this->families->listMembers($user);

        $unit = $user->units()
            ->wherePivot('status', 'active')
            ->with('area:id,name')
            ->first(['units.id', 'units.unit_number', 'units.block', 'units.area_id']);

        return Inertia::render('tenant/unit', [
            // Unit type (Pemilik/Penyewa) and management contact are still
            // placeholders — no source of truth for those yet. See task plan
            // for "Kelola Keluarga".
            'unit' => [
                'number' => $unit?->unit_number,
                'area' => $unit?->area?->name,
                'type' => 'Pemilik',
            ],
            'resident' => [
                'name' => $user->name,
                'phone' => $user->phone,
                'email' => $user->email,
            ],
            'familyMembers' => $familyMembers->take(3)->map(fn ($f) => [
                'id' => $f->id,
                'name' => $f->user->name,
                'phone' => $f->user->phone,
            ]),
            'familyMembersTotal' => $familyMembers->count(),
            'management' => [
                'phone' => '021-5551234',
                'email' => 'pengelola@hunianid.com',
                'hours' => 'Senin–Sabtu, 08:00–17:00',
            ],
        ]);
    }
}
