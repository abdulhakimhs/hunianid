<?php

namespace App\Services;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\Complex;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class RegistrationService
{
    public function __construct(
        private readonly ComplexResolverService $complexResolver,
        private readonly UnitResolverService $unitResolver,
    ) {}

    /**
     * The whole registration wizard, submitted once, at the very end — creates the
     * complex (if needed), the user, and the role-specific area/unit rows in one
     * transaction. Nothing touches the database until this runs.
     *
     * @param  array<string, mixed>  $data  Validated payload from RegistrationController::complete()
     */
    public function register(array $data): User
    {
        $user = DB::transaction(function () use ($data) {
            $complex = $this->resolveComplex($data);

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => Hash::make($data['password']),
            ]);

            if ($data['role'] === 'pengelola') {
                $this->createPengelolaArea($user, $complex, $data['sub_type'], $data['area_name']);
            } else {
                $this->registerPenghuni($user, $complex, $data);
            }

            return $user;
        });

        // Not auto-logged-in — the success screen sends them to /login instead.
        return $user;
    }

    private function resolveComplex(array $data): Complex
    {
        if ($data['location_mode'] === 'google') {
            return $this->complexResolver->resolveFromGoogle([
                'place_id' => $data['place_id'],
                'name' => $data['location_name'],
                'formatted_address' => $data['formatted_address'] ?? null,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
            ]);
        }

        return $this->complexResolver->createManual([
            'name' => $data['location_name'],
            'address' => $data['address'] ?? null,
            'province_code' => $data['province_code'],
            'city_code' => $data['city_code'],
        ]);
    }

    private function createPengelolaArea(User $user, Complex $complex, string $subType, string $areaName): void
    {
        $area = Area::create([
            'complex_id' => $complex->id,
            'name' => $areaName,
            'type' => $subType,
            'status' => 'active',
            'require_approval' => true,
            'created_by' => $user->id,
        ]);

        AreaMember::create([
            'area_id' => $area->id,
            'user_id' => $user->id,
            'role_id' => Role::where('key_name', 'superadmin')->value('id'),
            'status' => 'active',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function registerPenghuni(User $user, Complex $complex, array $data): void
    {
        $activeAreas = $this->complexResolver->activeAreas($complex);

        if ($activeAreas->isEmpty()) {
            $this->createUnclaimedArea($user, $complex);

            return;
        }

        $areaId = $activeAreas->count() === 1 ? $activeAreas->first()->id : (int) ($data['area_id'] ?? 0);
        $area = $activeAreas->firstWhere('id', $areaId);

        if (! $area) {
            throw ValidationException::withMessages(['area_id' => 'RT/pengelola tidak valid.']);
        }

        if (empty($data['unit_number'])) {
            throw ValidationException::withMessages(['unit_number' => 'Nomor rumah/unit wajib diisi.']);
        }

        $this->unitResolver->resolve($area, $data['unit_number'], $data['block'] ?? null, $user);

        AreaMember::create([
            'area_id' => $area->id,
            'user_id' => $user->id,
            'role_id' => Role::where('key_name', 'resident')->value('id'),
            'status' => 'pending_approval',
        ]);
    }

    private function createUnclaimedArea(User $user, Complex $complex): void
    {
        $area = Area::create([
            'complex_id' => $complex->id,
            'name' => 'Warga baru (belum ada pengurus)',
            'type' => null,
            'status' => 'unclaimed',
            'require_approval' => true,
            'created_by' => $user->id,
        ]);

        AreaMember::create([
            'area_id' => $area->id,
            'user_id' => $user->id,
            'role_id' => Role::where('key_name', 'resident')->value('id'),
            'status' => 'active',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);
    }
}
