<?php

namespace App\Http\Controllers;

use App\Models\VisitorPass;
use App\Services\QrCodeService;
use Inertia\Inertia;
use Inertia\Response;

class VisitorPassController extends Controller
{
    public function __construct(private readonly QrCodeService $qrCode) {}

    public function show(string $token): Response
    {
        $pass = VisitorPass::where('token', $token)->with(['unit', 'area.complex'])->first();

        if (! $pass) {
            return Inertia::render('visitor-pass/show', ['found' => false]);
        }

        $state = match (true) {
            $pass->status === 'cancelled' => 'cancelled',
            $pass->status === 'used' => 'used',
            $pass->isExpired() => 'expired',
            default => 'valid',
        };

        return Inertia::render('visitor-pass/show', [
            'found' => true,
            'state' => $state,
            'guestName' => $pass->guest_name,
            'vehicleInfo' => $pass->vehicle_info,
            'purpose' => $pass->purpose,
            'unitLabel' => trim("{$pass->unit?->block} {$pass->unit?->unit_number}"),
            'complexName' => $pass->area?->complex?->name,
            'validFrom' => $pass->valid_from->toIso8601String(),
            'validUntil' => $pass->valid_until->toIso8601String(),
            'qrSvg' => $state === 'valid'
                ? $this->qrCode->svg(url("/pass/{$pass->token}"))
                : null,
        ]);
    }
}
