<?php

namespace App\Services;

use App\Models\User;
use App\Models\VisitorPass;
use App\Models\WhatsappConversation;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates the WhatsApp AI visitor-pass conversation: resolves who is texting and
 * which unit their guest is for, hands the free-text turns to DeepSeek to extract
 * structured fields, and once complete creates the VisitorPass and replies with its
 * public QR link. See task_visitor_pass_whatsapp plan for the full design.
 */
class VisitorPassChatService
{
    private const RESET_PHRASES = ['mulai ulang', 'batal', 'reset'];

    public function __construct(
        private readonly WaBlastService $waBlast,
        private readonly DeepSeekService $deepSeek,
    ) {}

    public function handleIncomingMessage(string $rawPhone, string $text): void
    {
        $phone = PhoneNumber::normalize($rawPhone);
        $text = trim($text);

        $user = User::whereIn('phone', PhoneNumber::lookupVariants($rawPhone))->first();

        if (! $user) {
            $this->reply($phone, 'Maaf, nomor Anda belum terdaftar sebagai penghuni. Silakan hubungi admin perumahan Anda untuk mendaftar terlebih dahulu.');

            return;
        }

        $conversation = WhatsappConversation::firstOrNew(['phone' => $phone]);
        $conversation->user_id = $user->id;

        if (! $conversation->exists) {
            $conversation->status = 'collecting';
        } elseif ($conversation->status !== 'completed' && $conversation->isStale()) {
            $conversation->resetState();
        }

        if (in_array(mb_strtolower($text), self::RESET_PHRASES, true)) {
            $conversation->resetState();
            $conversation->last_message_at = now();
            $conversation->save();
            $this->reply($phone, 'Baik, kita mulai dari awal. Ceritakan tamu yang akan datang ya.');

            return;
        }

        if ($conversation->status === 'completed') {
            $conversation->resetState();
        }

        if ($conversation->status === 'awaiting_unit_choice') {
            $this->handleUnitChoice($conversation, $text);

            return;
        }

        $collected = $conversation->collected_fields ?? [];

        if (! isset($collected['unit_id'])) {
            $units = $user->units()->wherePivot('status', 'active')->with('area.complex')->get();

            if ($units->isEmpty()) {
                $this->reply($phone, 'Anda belum terdaftar sebagai penghuni aktif di unit manapun. Silakan hubungi admin perumahan Anda.');

                return;
            }

            if ($units->count() > 1) {
                $options = $units->values()->map(fn ($unit, $i) => [
                    'index' => $i + 1,
                    'unit_id' => $unit->id,
                    'area_id' => $unit->area_id,
                    'label' => sprintf(
                        '%s (%s)',
                        trim("{$unit->block} {$unit->unit_number}"),
                        $unit->area?->name ?? '-',
                    ),
                ])->all();

                $listText = collect($options)
                    ->map(fn ($o) => "{$o['index']}. {$o['label']}")
                    ->implode("\n");

                $collected['unit_options'] = $options;
                $conversation->collected_fields = $collected;
                $conversation->status = 'awaiting_unit_choice';
                $conversation->last_message_at = now();
                $conversation->save();

                $this->reply($phone, "Tamu ini untuk rumah yang mana?\n{$listText}\n\nBalas dengan angka pilihan Anda.");

                return;
            }

            $unit = $units->first();
            $collected['unit_id'] = $unit->id;
            $collected['area_id'] = $unit->area_id;
        }

        $conversation->collected_fields = $collected;

        $history = $conversation->history ?? [];
        $history[] = ['role' => 'user', 'content' => $text];

        try {
            $result = $this->deepSeek->converse($history);
        } catch (\Throwable $e) {
            Log::error('[visitor-pass-chat] deepseek call failed', ['phone' => $phone, 'exception' => $e->getMessage()]);
            $this->reply($phone, 'Maaf, sistem sedang sibuk. Silakan kirim ulang pesan Anda sebentar lagi.');

            return;
        }

        if (($result['action'] ?? null) === 'ask') {
            $history[] = ['role' => 'assistant', 'content' => (string) $result['message']];
            $conversation->history = $history;
            $conversation->last_message_at = now();
            $conversation->save();

            $this->reply($phone, (string) $result['message']);

            return;
        }

        $guestName = trim((string) ($result['guest_name'] ?? ''));
        $vehicleInfo = trim((string) ($result['vehicle_info'] ?? ''));
        $purpose = trim((string) ($result['purpose'] ?? ''));

        if ($guestName === '' || $vehicleInfo === '' || $purpose === '') {
            $history[] = ['role' => 'assistant', 'content' => 'Boleh diulangi, nama tamu dan info kendaraannya apa ya?'];
            $conversation->history = $history;
            $conversation->last_message_at = now();
            $conversation->save();

            $this->reply($phone, 'Boleh diulangi, nama tamu dan info kendaraannya apa ya?');

            return;
        }

        $conversation->history = $history;
        $this->finalizePass($conversation, $user, $guestName, $vehicleInfo, $purpose);
    }

    private function handleUnitChoice(WhatsappConversation $conversation, string $text): void
    {
        $collected = $conversation->collected_fields ?? [];
        $options = $collected['unit_options'] ?? [];

        $chosenIndex = (int) trim($text);
        $match = collect($options)->firstWhere('index', $chosenIndex);

        if (! $match) {
            $listText = collect($options)
                ->map(fn ($o) => "{$o['index']}. {$o['label']}")
                ->implode("\n");

            $this->reply($conversation->phone, "Maaf, saya tidak mengerti pilihan Anda. Balas dengan angka saja, contoh: 1\n\n{$listText}");

            return;
        }

        $collected['unit_id'] = $match['unit_id'];
        $collected['area_id'] = $match['area_id'];
        unset($collected['unit_options']);

        $conversation->collected_fields = $collected;
        $conversation->status = 'collecting';
        $conversation->last_message_at = now();
        $conversation->save();

        $this->reply($conversation->phone, 'Baik, sekarang ceritakan tamu yang akan datang ya (nama, kendaraan, dan keperluan).');
    }

    private function finalizePass(
        WhatsappConversation $conversation,
        User $user,
        string $guestName,
        string $vehicleInfo,
        string $purpose,
    ): void {
        $collected = $conversation->collected_fields ?? [];

        $pass = DB::transaction(function () use ($conversation, $user, $collected, $guestName, $vehicleInfo, $purpose) {
            $pass = VisitorPass::create([
                'area_id' => $collected['area_id'],
                'unit_id' => $collected['unit_id'],
                'user_id' => $user->id,
                'guest_name' => $guestName,
                'vehicle_info' => $vehicleInfo,
                'purpose' => $purpose,
                'status' => 'pending',
                'valid_from' => now(),
                'valid_until' => now()->endOfDay(),
                'source' => 'whatsapp_ai',
                'raw_input' => json_encode($conversation->history, JSON_UNESCAPED_UNICODE),
            ]);

            $conversation->status = 'completed';
            $conversation->visitor_pass_id = $pass->id;
            $conversation->last_message_at = now();
            $conversation->save();

            return $pass;
        });

        $link = url("/pass/{$pass->token}");
        $validUntil = $pass->valid_until->translatedFormat('d M Y H:i');

        $this->reply($conversation->phone, "Visitor pass berhasil dibuat!\n\nIni adalah visitor pass untuk tamu Anda, {$pass->guest_name} ({$pass->vehicle_info}). Tunjukkan tautan ini ke petugas keamanan saat tamu tiba:\n{$link}\n\nBerlaku sampai {$validUntil}.");
    }

    private function reply(string $phone, string $message): void
    {
        $this->waBlast->send($phone, $message);
    }
}
