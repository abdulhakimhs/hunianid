<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin wrapper around the Wablas WhatsApp Blast API (https://wablas.com/documentation/api).
 * Credentials aren't configured yet in every environment — when they're missing, the
 * message is logged instead of sent so the rest of the invite flow (scheduling, status
 * tracking) can still be tested end to end. Don't ship a missing-credentials environment
 * to production; `send()` returns a failure result there instead of silently no-oping.
 */
class WaBlastService
{
    /**
     * @return array{ok: bool, error: string|null}
     */
    public function send(string $phone, string $message): array
    {
        $token = config('services.wablas.token');
        $baseUrl = rtrim((string) config('services.wablas.base_url'), '/');
        $secretKey = config('services.wablas.secret_key');

        if (! $token) {
            Log::info('[wablas] not configured, logging message instead of sending', [
                'phone' => $phone,
                'message' => $message,
            ]);

            return app()->environment(['local', 'testing'])
                ? ['ok' => true, 'error' => null]
                : ['ok' => false, 'error' => 'WABLAS_TOKEN belum dikonfigurasi.'];
        }

        $authorization = $secretKey ? "{$token}.{$secretKey}" : $token;

        try {
            $response = Http::withHeaders(['Authorization' => $authorization])
                ->asForm()
                ->post("{$baseUrl}/api/send-message", [
                    'phone' => $this->normalizePhone($phone),
                    'message' => $message,
                ]);

            if ($response->successful() && ($response->json('status') ?? true) !== false) {
                return ['ok' => true, 'error' => null];
            }

            return ['ok' => false, 'error' => $response->json('message') ?? "HTTP {$response->status()}"];
        } catch (\Throwable $e) {
            Log::error('[wablas] send failed', ['phone' => $phone, 'exception' => $e->getMessage()]);

            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Wablas expects numbers in 62xxxxxxxxxx form, not the local 08xxxxxxxxxx format
     * most Indonesian users type.
     */
    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? $phone;

        return str_starts_with($digits, '0') ? '62'.substr($digits, 1) : $digits;
    }
}
