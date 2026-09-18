<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeepSeekService
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
        Kamu adalah asisten WhatsApp untuk membuatkan visitor pass (izin tamu) di sebuah
        perumahan. Tugasmu HANYA mengumpulkan info berikut dari penghuni, dalam Bahasa
        Indonesia, dengan gaya ramah, singkat, dan tidak kaku:
        - guest_name (nama tamu, wajib)
        - vehicle_info (jenis dan warna kendaraan, atau "jalan kaki" jika tanpa kendaraan, wajib)
        - purpose (keperluan kunjungan, boleh disimpulkan singkat dari konteks pesan, wajib)

        Balas HANYA dengan JSON valid, tanpa teks lain di luar JSON, dengan bentuk persis
        salah satu dari dua ini:
        {"action":"ask","message":"<pertanyaan lanjutan dalam Bahasa Indonesia>"}
        {"action":"complete","guest_name":"...","vehicle_info":"...","purpose":"..."}

        Jangan mengarang informasi yang belum diberikan pengguna. Jika pesan pertama sudah
        berisi info lengkap, langsung balas "complete". Jika ada info yang masih kosong,
        tanyakan HANYA field yang masih kosong dalam satu pertanyaan singkat, jangan
        mengulang pertanyaan untuk field yang sudah dijawab.
        PROMPT;

    public function converse(array $historyMessages): array
    {
        $baseUrl = rtrim((string) config('services.deepseek.base_url'), '/');

        $response = Http::withToken((string) config('services.deepseek.api_key'))
            ->timeout(20)
            ->post("{$baseUrl}/chat/completions", [
                'model' => config('services.deepseek.model'),
                'response_format' => ['type' => 'json_object'],
                'temperature' => 0.3,
                'messages' => array_merge(
                    [['role' => 'system', 'content' => self::SYSTEM_PROMPT]],
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
