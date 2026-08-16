<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class UnitResolverService
{
    /**
     * Resolve a unit within an area for a given user.
     *
     * - No matching unit in the complex -> creates it, user becomes the first (active) resident.
     * - Matching unit under the SAME area -> user is added as a pending resident, needs an
     *   existing resident on that unit to confirm.
     * - Matching unit under a DIFFERENT area (same complex) -> blocked as a conflict.
     */
    public function resolve(Area $area, string $unitNumber, ?string $block, User $user, string $relation = 'owner'): Unit
    {
        $normalizedAddress = $this->normalize($block, $unitNumber);

        $existing = Unit::where('complex_id', $area->complex_id)
            ->where('normalized_address', $normalizedAddress)
            ->first();

        if (! $existing) {
            $unit = Unit::create([
                'area_id' => $area->id,
                'complex_id' => $area->complex_id,
                'unit_number' => $unitNumber,
                'block' => $block,
                'normalized_address' => $normalizedAddress,
                'status' => 'active',
            ]);

            $unit->residents()->attach($user->id, [
                'relation' => $relation,
                'status' => 'active',
            ]);

            return $unit;
        }

        if ($existing->area_id !== $area->id) {
            throw ValidationException::withMessages([
                'unit_number' => 'Unit ini sudah terdaftar di RT/pengelola lain di komplek yang sama. Hubungi pengurus setempat jika ini keliru.',
            ]);
        }

        if ($existing->residents()->where('user_id', $user->id)->exists()) {
            return $existing;
        }

        $existingResident = $existing->residents()->wherePivot('status', 'active')->first();

        $existing->residents()->attach($user->id, [
            'relation' => $relation,
            'status' => $existingResident ? 'pending' : 'active',
            'confirmed_by' => $existingResident ? null : $user->id,
            'confirmed_at' => $existingResident ? null : now(),
        ]);

        return $existing;
    }

    private function normalize(?string $block, string $unitNumber): string
    {
        return strtolower(trim(($block ?? '').' '.$unitNumber));
    }
}
