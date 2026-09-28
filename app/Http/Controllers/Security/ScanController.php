<?php

namespace App\Http\Controllers\Security;

use App\Http\Controllers\Controller;
use App\Models\VisitorPass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ScanController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('security/scan');
    }

    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $pass = $this->findPass($request, $data['code']);

        if (! $pass || $pass->status === 'cancelled') {
            return response()->json(['status' => 'invalid']);
        }

        if ($pass->status === 'used') {
            return response()->json(['status' => 'used']);
        }

        if ($pass->isExpired()) {
            return response()->json(['status' => 'expired']);
        }

        return response()->json([
            'status' => 'valid',
            'visitor' => [
                'name' => $pass->guest_name,
                'unit' => trim("{$pass->unit?->block} {$pass->unit?->unit_number}") ?: '—',
                'purpose' => $pass->purpose,
                'validUntil' => $pass->valid_until->translatedFormat('d M Y H:i'),
            ],
        ]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $pass = $this->findPass($request, $data['code']);

        if (! $pass || $pass->status !== 'pending' || $pass->isExpired()) {
            return response()->json(['ok' => false], 422);
        }

        $pass->update([
            'status' => 'used',
            'used_at' => now(),
            'used_by' => $request->user()->id,
        ]);

        return response()->json(['ok' => true]);
    }

    private function findPass(Request $request, string $code): ?VisitorPass
    {
        $area = $request->attributes->get('adminArea');

        return VisitorPass::where('token', $this->extractToken($code))
            ->where('area_id', $area->id)
            ->with('unit:id,unit_number,block')
            ->first();
    }

    /**
     * The QR on the public pass page encodes the full "/pass/{token}" URL
     * (see VisitorPassController::show), while manual entry sends the bare
     * token — and mobile keyboards commonly auto-capitalize its first
     * character. Normalize both shapes into a lowercase token.
     */
    private function extractToken(string $code): string
    {
        $code = trim($code);

        if (str_contains($code, '/')) {
            $code = (string) Str::of($code)->rtrim('/')->afterLast('/');
        }

        return strtolower($code);
    }
}
