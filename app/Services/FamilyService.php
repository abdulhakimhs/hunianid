<?php

namespace App\Services;

use App\Exceptions\FamilyOwnershipException;
use App\Models\UnitUser;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Resident self-service family-member management — shared by the web/PWA forms
 * (FamilyController) and the WhatsApp chat flow (FamilyChatService), per the
 * project convention that business logic lives here so both consumers stay in sync.
 */
class FamilyService
{
    public function activeUnitsFor(User $actor): Collection
    {
        return $actor->units()
            ->wherePivot('status', 'active')
            ->get(['units.id', 'units.unit_number', 'units.block', 'units.area_id']);
    }

    public function listMembers(User $actor, ?int $unitId = null): Collection
    {
        $unitIds = $this->activeUnitsFor($actor)->pluck('id');

        if ($unitId !== null) {
            $unitIds = $unitIds->filter(fn ($id) => $id === $unitId)->values();
        }

        return UnitUser::where('relation', 'family')
            ->whereIn('unit_id', $unitIds)
            ->with(['user:id,name,phone', 'unit:id,unit_number,block'])
            ->latest()
            ->get();
    }

    public function addMember(User $actor, int $unitId, string $name, string $waNumber, ?int $confirmedBy = null): UnitUser
    {
        $unitId = $this->ownUnitOrFail($actor, $unitId);
        $phone = PhoneNumber::normalize($waNumber);
        $confirmedBy ??= $actor->id;

        return DB::transaction(function () use ($name, $phone, $unitId, $confirmedBy) {
            $user = User::where('phone', $phone)->first();

            if (! $user) {
                $user = User::create([
                    'name' => $name,
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

            return UnitUser::create([
                'unit_id' => $unitId,
                'user_id' => $user->id,
                'relation' => 'family',
                'status' => 'active',
                'confirmed_by' => $confirmedBy,
                'confirmed_at' => now(),
            ]);
        });
    }

    public function updateMember(User $actor, UnitUser $family, string $name, string $waNumber, int $unitId): UnitUser
    {
        $this->guardOwnFamilyRow($actor, $family);
        $unitId = $this->ownUnitOrFail($actor, $unitId);
        $phone = PhoneNumber::normalize($waNumber);

        return DB::transaction(function () use ($name, $phone, $unitId, $family) {
            $targetUser = User::where('phone', $phone)->first();

            if ($targetUser && $targetUser->id !== $family->user_id) {
                $family->user_id = $targetUser->id;
            } else {
                $family->user->update([
                    'name' => $name,
                    'phone' => $phone,
                ]);
            }

            $family->unit_id = $unitId;
            $family->save();

            return $family;
        });
    }

    public function removeMember(User $actor, UnitUser $family): void
    {
        $this->guardOwnFamilyRow($actor, $family);

        $family->delete();
    }

    private function guardOwnFamilyRow(User $actor, UnitUser $family): void
    {
        if ($family->relation !== 'family') {
            throw new FamilyOwnershipException('Bukan anggota keluarga.');
        }

        $this->ownUnitOrFail($actor, $family->unit_id);
    }

    private function ownUnitOrFail(User $actor, int $unitId): int
    {
        $isOwnActiveUnit = $actor->units()
            ->wherePivot('status', 'active')
            ->where('units.id', $unitId)
            ->exists();

        if (! $isOwnActiveUnit) {
            throw new FamilyOwnershipException('Anda bukan penghuni aktif unit ini.');
        }

        return $unitId;
    }
}
