<?php

namespace App\Services;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\Invite;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Admin adds a Security guard directly (no approval, unlike resident invites) — the
 * account is created immediately, but WITHOUT sending anything yet. Inviting (setting
 * a password via WhatsApp) is a separate, deliberate action from `/admin/security/
 * invites` — an RT may want to enter several guards' data first and invite them in
 * bulk once ready, rather than get a WhatsApp message fired the instant each row is
 * typed in. The invite itself never creates the membership, only lets an
 * already-existing account set a password (see Invite::isSecurityInvite()).
 */
class SecurityInviteService
{
    public function __construct(private readonly WaBlastService $waBlast) {}

    public function addGuard(Area $area, User $creator, string $name, string $phone, ?string $email): AreaMember
    {
        return DB::transaction(function () use ($area, $creator, $name, $phone, $email) {
            $user = User::where('phone', $phone)->first();

            if (! $user) {
                $user = User::create([
                    'name' => $name,
                    'phone' => $phone,
                    'email' => $email,
                ]);
            }

            $roleId = Role::where('key_name', 'security')->value('id');

            if (AreaMember::where([
                'area_id' => $area->id,
                'user_id' => $user->id,
                'role_id' => $roleId,
            ])->exists()) {
                throw ValidationException::withMessages([
                    'phone' => 'Nomor ini sudah terdaftar sebagai Security di area ini.',
                ]);
            }

            return AreaMember::create([
                'area_id' => $area->id,
                'user_id' => $user->id,
                'role_id' => $roleId,
                'status' => 'active',
                'approved_by' => $creator->id,
                'approved_at' => now(),
            ]);
        });
    }

    public function invite(AreaMember $member, User $creator): Invite
    {
        $member->loadMissing('user');

        if ($member->user->password !== null) {
            throw ValidationException::withMessages([
                'phone' => 'Akun ini sudah memiliki kata sandi — tidak perlu diundang lagi.',
            ]);
        }

        $active = Invite::where('area_member_id', $member->id)
            ->where('type', 'security')
            ->where('status', 'active')
            ->latest()
            ->first();

        if ($active) {
            $this->resend($active);

            return $active->fresh();
        }

        return $this->createInvite($member, $creator);
    }

    public function createInvite(AreaMember $member, User $creator): Invite
    {
        Invite::where('area_member_id', $member->id)
            ->where('type', 'security')
            ->where('status', 'active')
            ->update(['status' => 'revoked']);

        $invite = Invite::create([
            'area_id' => $member->area_id,
            'type' => 'security',
            'area_member_id' => $member->id,
            'created_by' => $creator->id,
            'code' => Str::random(32),
            'status' => 'active',
            'send_status' => 'pending',
        ]);

        $this->sendNow($invite);

        return $invite->fresh();
    }

    public function sendNow(Invite $invite): void
    {
        $invite->loadMissing(['areaMember.user', 'areaMember.area.complex']);

        $user = $invite->areaMember->user;
        $area = $invite->areaMember->area;
        $link = url("/security/claim/{$invite->code}");

        $message = strtr($area->securityInvitationMessageTemplate(), [
            '{nama}' => $user->name,
            '{komplek}' => $area->complex->name,
            '{link}' => $link,
        ]);

        $result = $this->waBlast->send($user->phone, $message);

        $invite->update([
            'send_status' => $result['ok'] ? 'sent' : 'failed',
            'sent_at' => $result['ok'] ? now() : null,
            'send_error' => $result['ok'] ? null : $result['error'],
        ]);
    }

    public function resend(Invite $invite): void
    {
        abort_unless($invite->status === 'active', 422, 'Tautan ini sudah tidak berlaku.');

        $this->sendNow($invite);
    }
}
