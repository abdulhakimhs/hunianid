<?php

namespace App\Http\Controllers;

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
}
