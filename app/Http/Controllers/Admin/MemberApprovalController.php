<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AreaMember;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MemberApprovalController extends Controller
{
    /**
     * GET /admin/members/pending
     */
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $pending = $area->areaMembers()
            ->with(['user:id,name,email,phone'])
            ->where('status', 'pending_approval')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->user->name,
                'email' => $m->user->email,
                'phone' => $m->user->phone,
                'created_at' => $m->created_at,
            ]);

        return Inertia::render('admin/members/pending', [
            'pending' => $pending,
            'areaName' => $area->name,
        ]);
    }

    public function approve(Request $request, AreaMember $member)
    {
        $area = $request->attributes->get('adminArea');
        abort_unless($member->area_id === $area->id, 403);

        $member->update([
            'status' => 'active',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return back();
    }

    public function reject(Request $request, AreaMember $member)
    {
        $area = $request->attributes->get('adminArea');
        abort_unless($member->area_id === $area->id, 403);

        $member->update([
            'status' => 'rejected',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return back();
    }
}
