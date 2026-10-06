<?php

namespace App\Http\Controllers;

use App\Exceptions\FamilyOwnershipException;
use App\Models\UnitUser;
use App\Services\FamilyService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Resident self-service: any active resident of a unit can add/edit/remove that unit's
 * "family" members (spouse, kids, etc.) without admin approval — this is the resident's
 * own call, separate from area_members which the area admin approves. Admins can only
 * view this data (see Admin\FamiliesController), never mutate it here.
 *
 * Business logic lives in FamilyService so the WhatsApp chat flow (FamilyChatService)
 * can reuse the exact same rules.
 */
class FamilyController extends Controller
{
    public function __construct(private readonly FamilyService $families) {}

    public function index(Request $request): Response
    {
        return Inertia::render('family/index', [
            'families' => $this->families->listMembers($request->user()),
            'units' => $this->families->activeUnitsFor($request->user()),
        ]);
    }

    public function tenantIndex(Request $request): Response
    {
        return Inertia::render('tenant/family/index', [
            'families' => $this->families->listMembers($request->user()),
            'units' => $this->families->activeUnitsFor($request->user()),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'wa_number' => ['required', 'string', 'max:20'],
            'unit_id' => ['required', 'integer', 'exists:units,id'],
        ]);

        try {
            $this->families->addMember(
                $request->user(),
                (int) $validated['unit_id'],
                $validated['name'],
                $validated['wa_number'],
            );
        } catch (FamilyOwnershipException $e) {
            abort(403, $e->getMessage());
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Keluarga berhasil ditambahkan.'),
        ]);

        return redirect()->back();
    }

    public function update(Request $request, UnitUser $family)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'wa_number' => ['required', 'string', 'max:20'],
            'unit_id' => ['required', 'integer', 'exists:units,id'],
        ]);

        try {
            $this->families->updateMember(
                $request->user(),
                $family,
                $validated['name'],
                $validated['wa_number'],
                (int) $validated['unit_id'],
            );
        } catch (FamilyOwnershipException $e) {
            abort($e->getMessage() === 'Bukan anggota keluarga.' ? 404 : 403, $e->getMessage());
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Keluarga berhasil diperbarui.'),
        ]);

        return redirect()->back();
    }

    public function destroy(Request $request, UnitUser $family)
    {
        try {
            $this->families->removeMember($request->user(), $family);
        } catch (FamilyOwnershipException $e) {
            abort($e->getMessage() === 'Bukan anggota keluarga.' ? 404 : 403, $e->getMessage());
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Keluarga berhasil dihapus.'),
        ]);

        return redirect()->back();
    }
}
