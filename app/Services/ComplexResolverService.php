<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Complex;
use Illuminate\Support\Collection;

class ComplexResolverService
{
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

    public function activeAreas(Complex $complex): Collection
    {

        return $complex->areas()->where('status', 'active')->get(['id', 'name', 'complex_id']);
    }

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
