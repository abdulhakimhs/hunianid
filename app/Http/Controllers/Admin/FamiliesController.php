<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use App\Models\UnitUser;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin can only VIEW family members — adding/editing/removing them is the resident's
 * own call (see FamilyController), not something the area admin approves or manages.
 */
class FamiliesController extends Controller
{
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $units = Unit::where('area_id', $area->id)
            ->get(['id', 'unit_number', 'block']);

        $families = UnitUser::where('relation', 'family')
            ->whereIn('unit_id', $units->pluck('id'))
            ->with(['user:id,name,phone', 'unit:id,unit_number,block'])
            ->latest()
            ->get();

        return Inertia::render('admin/families/index', [
            'families' => $families,
            'units' => $units,
            'area' => $area,
        ]);
    }
}
