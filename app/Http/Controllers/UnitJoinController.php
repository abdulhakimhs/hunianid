<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UnitJoinController extends Controller
{
    /**
     * GET /unit/join-requests — pending join requests on units the current user actively resides in.
     */
    public function index(Request $request): Response
    {
        $unitIds = $request->user()->units()->wherePivot('status', 'active')->pluck('units.id');

        $requests = DB::table('unit_user')
            ->join('units', 'units.id', '=', 'unit_user.unit_id')
            ->join('users', 'users.id', '=', 'unit_user.user_id')
            ->whereIn('unit_user.unit_id', $unitIds)
            ->where('unit_user.status', 'pending')
            ->select('unit_user.id', 'unit_user.unit_id', 'units.unit_number', 'units.block', 'users.name', 'users.email')
            ->get();

        return Inertia::render('unit/join-request', ['requests' => $requests]);
    }

    /**
     * POST /unit/{unit}/join-requests/{request}/confirm
     *
     * $joinRequest is the `unit_user` row (id doubles as the join-request id).
     */
    public function confirm(Request $request, Unit $unit, int $joinRequest)
    {
        $pivot = $this->pendingPivot($request, $unit, $joinRequest);

        DB::table('unit_user')->where('id', $pivot->id)->update([
            'status' => 'active',
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
            'updated_at' => now(),
        ]);

        return back();
    }

    public function decline(Request $request, Unit $unit, int $joinRequest)
    {
        $pivot = $this->pendingPivot($request, $unit, $joinRequest);

        DB::table('unit_user')->where('id', $pivot->id)->update([
            'status' => 'declined',
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
            'updated_at' => now(),
        ]);

        return back();
    }

    private function pendingPivot(Request $request, Unit $unit, int $joinRequest): object
    {
        $confirmerIsResident = $unit->residents()
            ->wherePivot('status', 'active')
            ->where('users.id', $request->user()->id)
            ->exists();

        abort_unless($confirmerIsResident, 403, 'Hanya penghuni terdaftar di unit ini yang bisa mengonfirmasi.');

        $pivot = DB::table('unit_user')
            ->where('id', $joinRequest)
            ->where('unit_id', $unit->id)
            ->where('status', 'pending')
            ->first();

        abort_unless($pivot, 404);

        return $pivot;
    }
}
