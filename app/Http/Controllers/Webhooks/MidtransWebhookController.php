<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Services\MidtransService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MidtransWebhookController extends Controller
{
    public function handle(Request $request, MidtransService $midtrans): JsonResponse
    {
        $midtrans->handleNotification($request->all());

        return response()->json(['ok' => true]);
    }
}
