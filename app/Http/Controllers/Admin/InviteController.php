<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AreaMember;
use App\Models\Invite;
use App\Models\Role;
use App\Models\Unit;
use App\Models\User;
use App\Services\MembershipContext;
use App\Services\TenantInviteService;
use App\Services\UnitResolverService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InviteController extends Controller
{
    /**
     * GET /admin/invites — the generic pengurus-handoff link (if any) plus the list of
     * targeted per-tenant invites for this area.
     */
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $activeInvite = $area->invites()->whereNull('unit_id')->where('status', 'active')->latest()->first();

        $tenantInvites = $area->invites()
            ->whereNotNull('unit_id')
            ->with('unit:id,unit_number,block')
            ->latest()
            ->get()
            ->map(fn (Invite $i) => [
                'id' => $i->id,
                'phone' => $i->phone,
                'unit' => trim(($i->unit->block ?? '').' '.$i->unit->unit_number),
                'status' => $i->status,
                'send_status' => $i->send_status,
                'scheduled_at' => $i->scheduled_at?->toIso8601String(),
                'sent_at' => $i->sent_at?->toIso8601String(),
                'send_error' => $i->send_error,
                'created_at' => $i->created_at?->toIso8601String(),
            ]);

        $units = Unit::where('area_id', $area->id)
            ->where('status', 'active')
            ->orderBy('block')
            ->orderBy('unit_number')
            ->get(['id', 'unit_number', 'block'])
            ->map(fn (Unit $u) => ['id' => $u->id, 'label' => trim(($u->block ?? '').' '.$u->unit_number)]);

        return Inertia::render('admin/invites/index', [
            'invite' => $activeInvite,
            'areaName' => $area->name,
            'frame' => $request->query('frame'),
            'tenantInvites' => $tenantInvites,
            'units' => $units,
        ]);
    }

    /**
     * POST /admin/invites — revokes any previously active generic link, creates a new
     * one. Used only to invite a future pengurus (see task_unclaimed_area_handover.md) —
     * unrelated to the per-tenant invites below.
     */
    public function store(Request $request)
    {
        $area = $request->attributes->get('adminArea');

        DB::transaction(function () use ($area, $request) {
            $area->invites()->whereNull('unit_id')->where('status', 'active')->update(['status' => 'revoked']);

            $area->invites()->create([
                'created_by' => $request->user()->id,
                'code' => Str::random(32),
                'status' => 'active',
            ]);
        });

        return redirect()->route('admin.invites.index');
    }

    /**
     * POST /admin/invites/tenant — creates a targeted invite for one phone number and
     * one specific unit. Sends immediately unless a future `scheduled_at` is given, in
     * which case `invites:send-scheduled` picks it up when due.
     */
    public function storeTenant(Request $request, TenantInviteService $service)
    {
        $area = $request->attributes->get('adminArea');

        $data = $request->validate([
            'unit_id' => ['required', 'integer', Rule::exists('units', 'id')->where('area_id', $area->id)],
            'phone' => ['required', 'string', 'max:20'],
            'scheduled_at' => ['nullable', 'date', 'after:now'],
        ]);

        $service->create(
            $area,
            $request->user(),
            (int) $data['unit_id'],
            $data['phone'],
            isset($data['scheduled_at']) ? Carbon::parse($data['scheduled_at']) : null,
        );

        return redirect()->route('admin.invites.index');
    }

    /**
     * POST /admin/invites/{invite}/revoke — works for both the generic link and
     * targeted tenant invites.
     */
    public function revoke(Request $request, Invite $invite)
    {
        $area = $request->attributes->get('adminArea');
        abort_unless($invite->area_id === $area->id, 403);

        $invite->update(['status' => 'revoked']);

        return redirect()->route('admin.invites.index');
    }

    /**
     * GET /invite/{code} — public, validates the token before showing any form.
     */
    public function show(string $code): Response
    {
        $invite = Invite::with('unit:id,unit_number,block')->where('code', $code)->first();

        if (! $invite || $invite->status !== 'active') {
            return Inertia::render('invite/show', ['valid' => false]);
        }

        $area = $invite->area()->with('complex:id,name')->first();

        return Inertia::render('invite/show', [
            'valid' => true,
            'code' => $invite->code,
            // An unclaimed area's `name` is just the internal placeholder ("Warga baru
            // (belum ada pengurus)") — not fit to show anyone. The complex name (the
            // actual perumahan) is what's meaningful here either way.
            'complexName' => $area->complex->name,
            'areaName' => $area->status === 'unclaimed' ? null : $area->name,
            'isUnclaimed' => $area->status === 'unclaimed',
            // A targeted invite already knows the phone/unit — the accept form shows
            // them read-only instead of asking again.
            'isTenantInvite' => $invite->isTenantInvite(),
            'phone' => $invite->phone,
            'unit' => $invite->unit ? trim(($invite->unit->block ?? '').' '.$invite->unit->unit_number) : null,
        ]);
    }

    /**
     * POST /invite/{code}/submit
     */
    public function submit(Request $request, string $code, UnitResolverService $unitResolver)
    {
        $invite = Invite::with('unit')->where('code', $code)->first();

        if (! $invite || $invite->status !== 'active') {
            return Inertia::render('invite/show', ['valid' => false]);
        }

        $isTenantInvite = $invite->isTenantInvite();

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['required', 'string', 'max:20'],
        ];

        if (! $isTenantInvite) {
            $rules['unit_number'] = ['required', 'string', 'max:50'];
            $rules['block'] = ['nullable', 'string', 'max:50'];
        }

        $data = $request->validate($rules);

        $area = $invite->area;

        $user = User::where('email', $data['email'])
            ->when($data['phone'] ?? null, fn ($q, $phone) => $q->orWhere('phone', $phone))
            ->first();

        if (! $user) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => Hash::make($data['password']),
            ]);
        }

        $membership = null;

        try {
            DB::transaction(function () use ($unitResolver, $area, $data, $user, $invite, $isTenantInvite, &$membership) {
                if ($isTenantInvite) {
                    $unitResolver->resolve($area, $invite->unit->unit_number, $invite->unit->block, $user, 'tenant');
                } else {
                    $unitResolver->resolve($area, $data['unit_number'], $data['block'] ?? null, $user);
                }

                $membership = $user->areaMemberships()
                    ->where('area_id', $area->id)
                    ->whereHas('role', fn ($q) => $q->where('key_name', 'resident'))
                    ->first();

                if (! $membership) {
                    // A personal, targeted invite is itself the vetting step — always
                    // active. The generic shareable link still respects the area's
                    // normal approval setting.
                    $needsApproval = ! $isTenantInvite && $area->status !== 'unclaimed' && $area->require_approval;

                    $membership = AreaMember::create([
                        'area_id' => $area->id,
                        'user_id' => $user->id,
                        'role_id' => Role::where('key_name', 'resident')->value('id'),
                        'status' => $needsApproval ? 'pending_approval' : 'active',
                        'approved_by' => $needsApproval ? null : $invite->created_by,
                        'approved_at' => $needsApproval ? null : now(),
                    ]);
                }

                if ($isTenantInvite) {
                    $invite->update(['status' => 'accepted']);
                }
            });
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        auth()->login($user);

        // The area they just joined becomes "current", not whatever they had selected
        // from a previous login.
        MembershipContext::select($request, $membership);

        return redirect()->route('dashboard');
    }
}
