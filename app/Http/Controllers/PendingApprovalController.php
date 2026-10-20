<?php

namespace App\Http\Controllers;

use App\Services\MembershipContext;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PendingApprovalController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $current = MembershipContext::current($request->user(), $request);

        return Inertia::render('pending-approval', [
            'areaName' => $current?->area->name,
        ]);
    }
}
