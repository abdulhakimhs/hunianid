<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Unit;
use Illuminate\Support\Collection;

/**
 * Resolves a recurring template's scope rule into a fresh list of {user, unit} targets
 * at generation time — deliberately never a stored snapshot, so residents who join or
 * leave a unit between runs are picked up automatically.
 */
class InvoiceTenantResolver
{
    /**
     * @return Collection<int, array{user: \App\Models\User, unit: Unit}>
     */
    public function resolve(Area $area, string $scopeType, ?array $scopeParams): Collection
    {
        return match ($scopeType) {
            'area_all_units' => $this->resolveAreaAllUnits($area),
            default => collect(),
        };
    }

    /**
     * Every unit in the area, billed to whichever residents currently have an active
     * `unit_user` link — the same relation VisitorPassChatService uses to resolve "which
     * units is this person actively part of," just walked from the area/unit side.
     *
     * @return Collection<int, array{user: \App\Models\User, unit: Unit}>
     */
    private function resolveAreaAllUnits(Area $area): Collection
    {
        return $area->units()
            ->with(['residents' => fn ($q) => $q->wherePivot('status', 'active')])
            ->get()
            ->flatMap(fn (Unit $unit) => $unit->residents->map(fn ($user) => ['user' => $user, 'unit' => $unit]));
    }
}
