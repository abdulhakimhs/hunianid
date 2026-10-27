<?php

namespace App\Services;

use App\Models\Unit;
use App\Models\User;

/**
 * Notifies a unit's existing active resident(s) when someone new claims to live
 * there and needs their confirmation (unit_user status=pending). Mirrors
 * TicketNotificationService — a single WaBlastService choke point, fire-and-forget.
 */
class UnitJoinNotificationService
{
    public function __construct(
        private readonly WaBlastService $waBlast,
    ) {}

    public function notifyResidentsOfJoinRequest(Unit $unit, User $requester): void
    {
        $unitLabel = trim(($unit->block ?? '').' '.$unit->unit_number);

        $message = "🏠 {$requester->name} mengaku tinggal di rumah Anda ({$unitLabel}) dan meminta konfirmasi Anda.\n\n".
            "Buka aplikasi HunianID > menu \"Permintaan Bergabung\" untuk konfirmasi atau tolak:\n".
            url('/unit/join-requests');

        $residents = $unit->residents()->wherePivot('status', 'active')->get();

        foreach ($residents as $resident) {
            if (! $resident->phone) {
                continue;
            }

            $this->waBlast->send($resident->phone, $message);
        }
    }
}
