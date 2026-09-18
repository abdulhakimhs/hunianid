<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Services\VisitorPassChatService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WablasWebhookController extends Controller
{
    public function incoming(Request $request, VisitorPassChatService $service): JsonResponse
    {
        $expectedSecret = config('services.wablas.webhook_secret');

        if ($expectedSecret && $request->query('key') !== $expectedSecret) {
            return response()->json(['ok' => false, 'error' => 'unauthorized'], 403);
        }

        $phone = $request->input('phone') ?? $request->input('sender') ?? $request->input('from');
        $text = $request->input('message') ?? $request->input('text');

        if (! $phone || ! $text) {
            return response()->json(['ok' => false, 'error' => 'missing phone/message'], 422);
        }

        $service->handleIncomingMessage((string) $phone, (string) $text);

        return response()->json(['ok' => true]);
    }
}
