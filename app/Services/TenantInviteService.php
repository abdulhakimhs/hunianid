<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Invite;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TenantInviteService
{
    public function __construct(private readonly WaBlastService $waBlast) {}

    public function create(Area $area, User $creator, int $unitId, string $phone, ?Carbon $scheduledAt): Invite
    {
        $invite = DB::transaction(function () use ($area, $creator, $unitId, $phone, $scheduledAt) {
            return Invite::create([
                'area_id' => $area->id,
                'unit_id' => $unitId,
                'created_by' => $creator->id,
                'code' => Str::random(32),
                'phone' => $phone,
                'status' => 'active',
                'send_status' => 'pending',
                'scheduled_at' => $scheduledAt,
            ]);
        });

        if (! $scheduledAt || $scheduledAt->isPast()) {
            $this->sendNow($invite);
        }

        return $invite->fresh();
    }

    public function sendNow(Invite $invite): void
    {
        $invite->loadMissing(['area.complex', 'unit']);

        $link = url("/invite/{$invite->code}");
        $unitLabel = trim(($invite->unit->block ?? '').' '.$invite->unit->unit_number);
        $complexName = $invite->area->complex->name;

        $message = strtr($invite->area->invitationMessageTemplate(), [
            '{komplek}' => $complexName,
            '{unit}' => $unitLabel,
            '{link}' => $link,
        ]);

        $result = $this->waBlast->send($invite->phone, $message);

        $invite->update([
            'send_status' => $result['ok'] ? 'sent' : 'failed',
            'sent_at' => $result['ok'] ? now() : null,
            'send_error' => $result['ok'] ? null : $result['error'],
        ]);
    }
}
