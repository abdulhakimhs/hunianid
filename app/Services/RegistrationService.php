<?php

namespace App\Services;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\Complex;
use App\Models\Plan;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RegistrationService
{
    public function __construct(
        private readonly ComplexResolverService $complexResolver,
        private readonly UnitResolverService $unitResolver,
        private readonly SubscriptionService $subscriptions,
    ) {}

    /**
     * @return array{user: User, requiresPayment: bool}
     */
    public function register(array $data, string $mode = 'normal'): array
    {
        return DB::transaction(function () use ($data, $mode) {
            $complex = $this->resolveComplex($data);
            $user = User::create($this->userAttributes($data, $mode));

            $requiresPayment = false;

            if ($data['role'] === 'pengelola') {
                $requiresPayment = $this->createPengelolaArea(
                    $user,
                    $complex,
                    $data['sub_type'],
                    $data['area_name'],
                    $data['intended_plan'] ?? null,
                );
            } else {
                $this->registerPenghuni($user, $complex, $data);
            }

            return ['user' => $user, 'requiresPayment' => $requiresPayment];
        });
    }

    private function userAttributes(array $data, string $mode): array
    {
        if ($mode === 'phone_quick') {
            $phone = $data['phone'];

            return [
                'name' => 'Warga '.substr($phone, -4),
                'email' => "phone-{$phone}@pending.hunianid.local",
                'phone' => $phone,
                'password' => Hash::make(Str::random(40)),
                'profile_completed_at' => null,
            ];
        }

        return [
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $mode === 'google' ? Hash::make(Str::random(40)) : Hash::make($data['password']),
            'profile_completed_at' => now(),
        ];
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

    /**
     * Returns whether the new area is now gated on an unpaid checkout (true)
     * vs. granted the usual free trial (false) — the controller uses this to
     * decide whether to land the new admin on the dashboard or straight on
     * the billing "cart" to finish paying for the plan they picked on the
     * landing page.
     */
    private function createPengelolaArea(User $user, Complex $complex, string $subType, string $areaName, ?string $intendedPlanKey): bool
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

        $paidPlan = $intendedPlanKey && $intendedPlanKey !== 'trial'
            ? Plan::where('key', $intendedPlanKey)->where('is_self_service', true)->first()
            : null;

        if ($paidPlan) {
            $this->subscriptions->startPendingCheckout($area, $paidPlan);

            return true;
        }

        $this->subscriptions->startTrial($area);

        return false;
    }

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
