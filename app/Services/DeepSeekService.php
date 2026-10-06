<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeepSeekService
{
    public function converse(array $historyMessages, string $systemPrompt): array
    {
        $baseUrl = rtrim((string) config('services.deepseek.base_url'), '/');

        $response = Http::withToken((string) config('services.deepseek.api_key'))
            ->timeout(20)
            ->post("{$baseUrl}/chat/completions", [
                'model' => config('services.deepseek.model'),
                'response_format' => ['type' => 'json_object'],
                'temperature' => 0.3,
                'messages' => array_merge(
                    [['role' => 'system', 'content' => $systemPrompt]],
                    $historyMessages,
                ),
            ]);

        if (! $response->successful()) {
            Log::error('[deepseek] request failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new \RuntimeException('DeepSeek API error: HTTP '.$response->status());
        }

        $content = $response->json('choices.0.message.content');
        $decoded = json_decode((string) $content, true);

        if (! is_array($decoded) || ! isset($decoded['action'])) {
            Log::error('[deepseek] malformed JSON output', ['raw' => $content]);

            throw new \RuntimeException('DeepSeek returned malformed JSON.');
        }

        return $decoded;
    }
}
