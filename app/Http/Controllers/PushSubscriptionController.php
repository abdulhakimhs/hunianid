<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:512'],
            'keys.p256dh' => ['required', 'string'],
            'keys.auth' => ['required', 'string'],
        ]);

        PushSubscription::updateOrCreate(
            ['user_id' => $request->user()->id, 'endpoint' => $data['endpoint']],
            [
                'p256dh' => $data['keys']['p256dh'],
                'auth' => $data['keys']['auth'],
            ],
        );

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:512'],
        ]);

        PushSubscription::where('endpoint', $data['endpoint'])
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['ok' => true]);
    }
}
