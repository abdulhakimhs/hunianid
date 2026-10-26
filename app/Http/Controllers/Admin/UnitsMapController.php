<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\UnitsMapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UnitsMapController extends Controller
{
    public function __construct(
        private readonly UnitsMapService $service,
    ) {}

    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        return Inertia::render('admin/units-map', [
            'area' => $area,
            'initial' => $this->service->buildPayload($area),
        ]);
    }

    /**
     * GET /admin/units-map/data — polled by the frontend every ~12s to keep the map
     * live (panic alerts, ticket/invoice counts) without a full page reload. No
     * broadcasting infra exists in this project yet, so polling is the v1 mechanism.
     */
    public function data(Request $request): JsonResponse
    {
        $area = $request->attributes->get('adminArea');

        return response()->json($this->service->buildPayload($area));
    }
}
