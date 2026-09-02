<?php

namespace App\Http\Controllers;

use App\Services\MembershipContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MembershipSwitchController extends Controller
{
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
