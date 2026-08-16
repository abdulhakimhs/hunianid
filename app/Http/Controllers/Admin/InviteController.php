<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AreaMember;
use App\Models\Invite;
use App\Models\Role;
use App\Models\User;
use App\Services\MembershipContext;
use App\Services\UnitResolverService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InviteController extends Controller
{
    /**
     * GET /admin/invites — currently active invite for the admin's area, if any.
     */
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $activeInvite = $area->invites()->where('status', 'active')->latest()->first();

        return Inertia::render('admin/invites/index', [
            'invite' => $activeInvite,
            'areaName' => $area->name,
            'frame' => $request->query('frame'),
        ]);
    }

    /**
     * POST /admin/invites — revokes any previously active invite, creates a new one.
     */
    public function store(Request $request)
    {
        $area = $request->attributes->get('adminArea');

        DB::transaction(function () use ($area, $request) {
            $area->invites()->where('status', 'active')->update(['status' => 'revoked']);

            $area->invites()->create([
                'created_by' => $request->user()->id,
                'code' => Str::random(32),
                'status' => 'active',
            ]);
        });

        return redirect()->route('admin.invites.index');
    }

    /**
     * POST /admin/invites/{invite}/revoke
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
        $invite = Invite::where('code', $code)->first();

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
        ]);
    }

    /**
     * POST /invite/{code}/submit
     */
    public function submit(Request $request, string $code, UnitResolverService $unitResolver)
    {
        $invite = Invite::where('code', $code)->first();

        if (! $invite || $invite->status !== 'active') {
            return Inertia::render('invite/show', ['valid' => false]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['required', 'string', 'max:20'],
            'unit_number' => ['required', 'string', 'max:50'],
            'block' => ['nullable', 'string', 'max:50'],
        ]);

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
            DB::transaction(function () use ($unitResolver, $area, $data, $user, $invite, &$membership) {
                $unitResolver->resolve($area, $data['unit_number'], $data['block'] ?? null, $user);

                $membership = $user->areaMemberships()
                    ->where('area_id', $area->id)
                    ->whereHas('role', fn ($q) => $q->where('key_name', 'resident'))
                    ->first();

                if (! $membership) {
                    // An unclaimed area has no admin yet to approve anyone, so joining it
                    // always goes straight to active regardless of require_approval —
                    // approval only kicks in once the area is actually claimed.
                    $needsApproval = $area->status !== 'unclaimed' && $area->require_approval;

                    $membership = AreaMember::create([
                        'area_id' => $area->id,
                        'user_id' => $user->id,
                        'role_id' => Role::where('key_name', 'resident')->value('id'),
                        'status' => $needsApproval ? 'pending_approval' : 'active',
                        'approved_by' => $needsApproval ? null : $invite->created_by,
                        'approved_at' => $needsApproval ? null : now(),
                    ]);
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
