<?php

namespace App\Services;

use App\Models\VisitorPass;

/**
 * Tells the resident who created a visitor pass that their guest has arrived,
 * right after security checks the guest in. Mirrors UnitJoinNotificationService
 * — a single WaBlastService choke point, fire-and-forget.
 */
class VisitorPassNotificationService
{
    public function __construct(
        private readonly WaBlastService $waBlast,
    ) {}

    public function notifyArrival(VisitorPass $pass): void
    {
        $pass->loadMissing(['user', 'unit', 'area']);

        $host = $pass->user;

        if (! $host?->phone) {
            return;
        }

        $unitLabel = trim(($pass->unit->block ?? '').' '.$pass->unit->unit_number);
        $time = ($pass->used_at ?? now())->timezone('Asia/Jakarta')->format('H:i').' WIB';

        $message = "Halo {$host->name}, tamu Anda *{$pass->guest_name}* sudah tiba dan masuk ke {$pass->area->name} pada {$time}, dicatat oleh petugas keamanan.\n"
            ."Unit tujuan: {$unitLabel}.";

        $this->waBlast->send($host->phone, $message);
    }
}
