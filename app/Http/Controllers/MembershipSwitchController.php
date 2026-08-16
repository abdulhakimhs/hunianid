<?php

namespace App\Http\Controllers;

use App\Services\MembershipContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MembershipSwitchController extends Controller
{
    /**
     * POST /switch-membership — lets a user switch which area/role the app currently
     * reflects for them. Returns JSON rather than an Inertia redirect so the frontend
     * can do a hard page reload, avoiding Inertia's prefetch cache serving a stale
     * response for the previous area.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'membership_id' => ['required', 'integer'],
        ]);

        $membership = $request->user()->areaMemberships()
            ->where('status', 'active')
            ->where('id', $data['membership_id'])
            ->firstOrFail();

        MembershipContext::select($request, $membership);

        return response()->json(['redirect' => route('dashboard')]);
    }
}
