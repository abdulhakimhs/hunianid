<?php

namespace App\Http\Controllers;

use App\Models\UnitUser;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Resident self-service: any active resident of a unit can add/edit/remove that unit's
 * "family" members (spouse, kids, etc.) without admin approval — this is the resident's
 * own call, separate from area_members which the area admin approves. Admins can only
 * view this data (see Admin\FamiliesController), never mutate it here.
 */
class FamilyController extends Controller
{
    public function index(Request $request): Response
    {
        $units = $request->user()->units()
            ->wherePivot('status', 'active')
            ->get(['units.id', 'units.unit_number', 'units.block']);

        $families = UnitUser::where('relation', 'family')
            ->whereIn('unit_id', $units->pluck('id'))
            ->with(['user:id,name,phone', 'unit:id,unit_number,block'])
            ->latest()
            ->get();

        return Inertia::render('family/index', [
            'families' => $families,
            'units' => $units,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'wa_number' => ['required', 'string', 'max:20'],
            'unit_id' => ['required', 'integer', 'exists:units,id'],
        ]);

        $unitId = $this->ownUnitOrFail($request, (int) $validated['unit_id']);
        $phone = $this->normalizePhone($validated['wa_number']);
        $confirmedBy = $request->user()->id;

        DB::transaction(function () use ($validated, $phone, $unitId, $confirmedBy) {
            $user = User::where('phone', $phone)->first();

            if (! $user) {
                $user = User::create([
                    'name' => $validated['name'],
                    'phone' => $phone,
                    'email' => null,
                    'password' => null,
                ]);
            }

            $existing = UnitUser::where('unit_id', $unitId)
                ->where('user_id', $user->id)
                ->exists();

            if ($existing) {
                throw ValidationException::withMessages([
                    'wa_number' => 'Anggota ini sudah terdaftar di unit tersebut.',
                ]);
            }

            UnitUser::create([
                'unit_id' => $unitId,
                'user_id' => $user->id,
                'relation' => 'family',
                'status' => 'active',
                'confirmed_by' => $confirmedBy,
                'confirmed_at' => now(),
            ]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Keluarga berhasil ditambahkan.'),
        ]);

        return redirect()->route('family.index');
    }

    public function update(Request $request, UnitUser $family)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'wa_number' => ['required', 'string', 'max:20'],
            'unit_id' => ['required', 'integer', 'exists:units,id'],
        ]);

        $this->guardOwnFamilyRow($request, $family);
        $unitId = $this->ownUnitOrFail($request, (int) $validated['unit_id']);
        $phone = $this->normalizePhone($validated['wa_number']);

        DB::transaction(function () use ($validated, $phone, $unitId, $family) {
            $targetUser = User::where('phone', $phone)->first();

            if ($targetUser && $targetUser->id !== $family->user_id) {
                $family->user_id = $targetUser->id;
            } else {
                $family->user->update([
                    'name' => $validated['name'],
                    'phone' => $phone,
                ]);
            }

            $family->unit_id = $unitId;
            $family->save();
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Keluarga berhasil diperbarui.'),
        ]);

        return redirect()->route('family.index');
    }

    public function destroy(Request $request, UnitUser $family)
    {
        $this->guardOwnFamilyRow($request, $family);

        $family->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Keluarga berhasil dihapus.'),
        ]);

        return redirect()->route('family.index');
    }

    private function guardOwnFamilyRow(Request $request, UnitUser $family): void
    {
        abort_unless($family->relation === 'family', 404);
        $this->ownUnitOrFail($request, $family->unit_id);
    }

    private function ownUnitOrFail(Request $request, int $unitId): int
    {
        $isOwnActiveUnit = $request->user()->units()
            ->wherePivot('status', 'active')
            ->where('units.id', $unitId)
            ->exists();

        abort_unless($isOwnActiveUnit, 403, 'Anda bukan penghuni aktif unit ini.');

        return $unitId;
    }

    private function normalizePhone(string $phone): string
    {
        return PhoneNumber::normalize($phone);
    }
}
