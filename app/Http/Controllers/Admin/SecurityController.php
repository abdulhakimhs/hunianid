<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AreaMember;
use App\Models\Invite;
use App\Services\MembershipContext;
use App\Services\SecurityInviteService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin CRUD for Security (satpam) guards, the separate "invite via WhatsApp" flow
 * (`invitesIndex()`/`invite()`), and the public claim-password flow the WhatsApp link
 * points to. The account (User + area_members role=security) is created immediately
 * on `store()` but nothing is sent yet — inviting is a deliberate follow-up action, so
 * an admin can enter several guards' data first and invite them once ready. Unlike
 * resident invites, the invite here never creates the membership itself, it only lets
 * an already-existing account set a password.
 */
class SecurityController extends Controller
{
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $guards = AreaMember::where('area_id', $area->id)
            ->whereHas('role', fn ($q) => $q->where('key_name', 'security'))
            ->with(['user:id,name,phone,email,password'])
            ->latest()
            ->get()
            ->map(fn (AreaMember $member) => [
                'id' => $member->id,
                'user_id' => $member->user_id,
                'name' => $member->user->name,
                'phone' => $member->user->phone,
                'email' => $member->user->email,
                'status' => $member->status,
                'claimed' => $member->user->password !== null,
                'created_at' => $member->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/security/index', [
            'guards' => $guards,
            'area' => $area,
        ]);
    }

    public function store(Request $request, SecurityInviteService $service)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $area = $request->attributes->get('adminArea');

        try {
            $service->addGuard($area, $request->user(), $data['name'], $data['phone'], $data['email'] ?? null);
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Data Security berhasil ditambahkan.')]);

        return redirect()->route('admin.security.index');
    }

    public function update(Request $request, AreaMember $security)
    {
        $area = $request->attributes->get('adminArea');
        abort_unless($security->area_id === $area->id && $security->role->key_name === 'security', 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'status' => ['required', 'string', 'in:active,suspended'],
        ]);

        $security->user->update([
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
        ]);

        $security->update(['status' => $data['status']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Data Security berhasil diperbarui.')]);

        return redirect()->route('admin.security.index');
    }

    public function destroy(Request $request, AreaMember $security)
    {
        $area = $request->attributes->get('adminArea');
        abort_unless($security->area_id === $area->id && $security->role->key_name === 'security', 404);

        $security->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Akun Security berhasil dihapus.')]);

        return redirect()->route('admin.security.index');
    }

    public function invitesIndex(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $guards = AreaMember::where('area_id', $area->id)
            ->whereHas('role', fn ($q) => $q->where('key_name', 'security'))
            ->with(['user:id,name,phone,email,password', 'securityInvites'])
            ->latest()
            ->get()
            ->map(function (AreaMember $member) {
                $claimed = $member->user->password !== null;
                $activeInvite = $member->securityInvites->firstWhere('status', 'active');

                return [
                    'id' => $member->id,
                    'name' => $member->user->name,
                    'phone' => $member->user->phone,
                    'claimed' => $claimed,
                    'claim_link' => $activeInvite ? url("/security/claim/{$activeInvite->code}") : null,
                    'invites' => $member->securityInvites->map(fn (Invite $i) => [
                        'id' => $i->id,
                        'status' => $i->status,
                        'send_status' => $i->send_status,
                        'send_error' => $i->send_error,
                        'sent_at' => $i->sent_at?->toIso8601String(),
                        'created_at' => $i->created_at?->toIso8601String(),
                    ])->values(),
                ];
            });

        return Inertia::render('admin/security/invites', [
            'guards' => $guards,
            'area' => $area,
            'securityMessageTemplate' => $area->securityInvitationMessageTemplate(),
        ]);
    }

    public function invite(Request $request, AreaMember $security, SecurityInviteService $service)
    {
        $area = $request->attributes->get('adminArea');
        abort_unless($security->area_id === $area->id && $security->role->key_name === 'security', 404);

        try {
            $service->invite($security, $request->user());
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Undangan WhatsApp dikirim.')]);

        return redirect()->route('admin.security.invites');
    }

    public function bulkInvite(Request $request, SecurityInviteService $service)
    {
        $area = $request->attributes->get('adminArea');

        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
        ]);

        $members = AreaMember::whereIn('id', $data['ids'])
            ->where('area_id', $area->id)
            ->whereHas('role', fn ($q) => $q->where('key_name', 'security'))
            ->with('user')
            ->get();

        $sent = 0;
        $skipped = 0;

        foreach ($members as $member) {
            if ($member->user->password !== null) {
                $skipped++;

                continue;
            }

            $service->invite($member, $request->user());
            $sent++;
        }

        $message = "{$sent} undangan WhatsApp terkirim.";

        if ($skipped > 0) {
            $message .= " {$skipped} dilewati karena sudah punya kata sandi.";
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __($message)]);

        return redirect()->route('admin.security.invites');
    }

    public function show(string $code): Response
    {
        $invite = Invite::where('code', $code)
            ->where('type', 'security')
            ->with(['areaMember.user', 'areaMember.area.complex'])
            ->first();

        if (! $invite || $invite->status !== 'active') {
            return Inertia::render('security/claim', ['valid' => false]);
        }

        if ($invite->areaMember->user->password !== null) {
            return Inertia::render('security/claim', ['valid' => false, 'alreadyClaimed' => true]);
        }

        return Inertia::render('security/claim', [
            'valid' => true,
            'code' => $invite->code,
            'name' => $invite->areaMember->user->name,
            'complexName' => $invite->areaMember->area->complex->name,
            'areaName' => $invite->areaMember->area->name,
        ]);
    }

    public function submit(Request $request, string $code)
    {
        $invite = Invite::where('code', $code)
            ->where('type', 'security')
            ->with(['areaMember.user', 'areaMember.area.complex'])
            ->first();

        if (! $invite || $invite->status !== 'active' || $invite->areaMember->user->password !== null) {
            return Inertia::render('security/claim', ['valid' => false]);
        }

        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $invite->areaMember->user;
        $membership = $invite->areaMember;

        $user->update(['password' => $data['password']]);
        $invite->update(['status' => 'accepted']);

        auth()->login($user);

        MembershipContext::select($request, $membership);

        return Inertia::render('security/claim', [
            'valid' => true,
            'claimed' => true,
            'code' => $invite->code,
            'name' => $user->name,
            'complexName' => $membership->area->complex->name,
            'areaName' => $membership->area->name,
        ]);
    }
}
