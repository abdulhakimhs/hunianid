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
 * Admin adds a Staff RT helper directly (no approval, unlike resident invites) — the
 * account is created immediately, but WITHOUT sending anything yet. Inviting (setting
 * a password via WhatsApp) is a separate, deliberate action from `/admin/staff/
 * invites`. Mirrors SecurityInviteService: the invite itself never creates the
 * membership, only lets an already-existing account set a password. Multi-area access
 * for the same person is just another `addStaff()` call from a second area's admin
 * session — no separate multi-area picker.
 */
class StaffInviteService
{
    private const INVITE_MESSAGE = 'Halo {nama}! {komplek} telah membuat akun Staff untuk Anda. '.
        'Silakan buat kata sandi Anda lewat tautan berikut untuk mulai menggunakan aplikasi: {link}'.
        "\n\nTautan ini bersifat pribadi, jangan bagikan ke orang lain.";

    public function __construct(private readonly WaBlastService $waBlast) {}

    public function addStaff(Area $area, User $creator, string $name, string $phone, ?string $email): AreaMember
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

            $roleId = Role::where('key_name', 'staff')->value('id');

            if (AreaMember::where([
                'area_id' => $area->id,
                'user_id' => $user->id,
                'role_id' => $roleId,
            ])->exists()) {
                throw ValidationException::withMessages([
                    'phone' => 'Nomor ini sudah terdaftar sebagai Staff di area ini.',
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
            ->where('type', 'staff')
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
            ->where('type', 'staff')
            ->where('status', 'active')
            ->update(['status' => 'revoked']);

        $invite = Invite::create([
            'area_id' => $member->area_id,
            'type' => 'staff',
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
        $link = url("/staff/claim/{$invite->code}");

        $message = strtr(self::INVITE_MESSAGE, [
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
