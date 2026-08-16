<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Complex;
use Illuminate\Support\Collection;

class ComplexResolverService
{
    /**
     * Resolve (find or create) a complex from a Google Places selection.
     *
     * @param  array{place_id: string, name: string, formatted_address?: string|null, latitude?: float|null, longitude?: float|null}  $data
     */
    public function resolveFromGoogle(array $data): Complex
    {
        return Complex::firstOrCreate(
            ['google_place_id' => $data['place_id']],
            [
                'source' => 'google',
                'name' => $data['name'],
                'formatted_address' => $data['formatted_address'] ?? null,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
            ],
        );
    }

    /**
     * Create a manually-entered complex. Not deduplicated (no google_place_id anchor).
     *
     * @param  array{name: string, address: string, province_code: string, city_code: string}  $data
     */
    public function createManual(array $data): Complex
    {
        return Complex::create([
            'source' => 'manual',
            'google_place_id' => null,
            'name' => $data['name'],
            'formatted_address' => $data['address'] ?? null,
            'province_code' => $data['province_code'],
            'city_code' => $data['city_code'],
        ]);
    }

    /**
     * @return Collection<int, Area>
     */
    public function activeAreas(Complex $complex): Collection
    {
        // Needs more than id/name: RegistrationService passes these rows straight into
        // UnitResolverService, which reads complex_id off the model.
        return $complex->areas()->where('status', 'active')->get(['id', 'name', 'complex_id']);
    }

    /**
     * Read-only preview for the "found: X — N RT/pengelola terdaftar" messaging — does
     * NOT create anything. Manual entries are never deduplicated, so only
     * Google-resolved complexes can already exist here.
     *
     * @return array{active_areas_count: int, active_areas: array<int, array{id: int, name: string}>}
     */
    public function previewFromGooglePlaceId(string $placeId): array
    {
        $complex = Complex::where('google_place_id', $placeId)->first();

        if (! $complex) {
            return ['active_areas_count' => 0, 'active_areas' => []];
        }

        $activeAreas = $this->activeAreas($complex);

        return [
            'active_areas_count' => $activeAreas->count(),
            'active_areas' => $activeAreas->map(fn ($a) => ['id' => $a->id, 'name' => $a->name])->all(),
        ];
    }
}
