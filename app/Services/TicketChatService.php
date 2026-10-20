<?php

namespace App\Services;

use App\Models\Ticket;
use App\Models\TicketChatConversation;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates the WhatsApp AI ticket/complaint-reporting conversation: resolves who
 * is texting and which unit the report is for, hands the free-text turns to DeepSeek
 * to extract category+description, and once complete creates the Ticket and notifies
 * the area's admins. Structured identically to VisitorPassChatService/FamilyChatService.
 */
class TicketChatService
{
    private const RESET_PHRASES = ['mulai ulang', 'batal', 'reset'];

    private const CATEGORY_LABELS = [
        'maintenance' => 'Perbaikan',
        'security' => 'Keamanan',
        'cleanliness' => 'Kebersihan',
        'other' => 'Lainnya',
    ];

    private const SYSTEM_PROMPT = <<<'PROMPT'
        Kamu adalah asisten WhatsApp untuk mencatat laporan/komplain penghuni di sebuah
        perumahan, misalnya kerusakan fasilitas atau kebersihan. Tugasmu HANYA
        mengumpulkan dari penghuni, dalam Bahasa Indonesia, ramah dan singkat:
        - category (salah satu dari: "Perbaikan", "Keamanan", "Kebersihan", "Lainnya" —
          simpulkan dari isi laporan, wajib)
        - description (deskripsi masalah, wajib)

        Balas HANYA dengan JSON valid, tanpa teks lain di luar JSON, dengan bentuk
        persis salah satu dari dua ini:
        {"action":"ask","message":"<pertanyaan lanjutan dalam Bahasa Indonesia>"}
        {"action":"complete","category":"Perbaikan|Keamanan|Kebersihan|Lainnya","description":"..."}

        Jangan mengarang informasi yang belum diberikan pengguna. Jika pesan pertama
        sudah berisi info lengkap untuk menyimpulkan kategori dan deskripsi, langsung
        balas "complete". Jika deskripsinya belum jelas, tanyakan singkat.
        PROMPT;

    public function __construct(
        private readonly WaBlastService $waBlast,
        private readonly DeepSeekService $deepSeek,
        private readonly TicketNotificationService $notifier,
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

        $conversation = TicketChatConversation::firstOrNew(['phone' => $phone]);
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
            $this->reply($phone, 'Baik, kita mulai dari awal. Ceritakan masalah yang ingin Anda laporkan.');

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

                $this->reply($phone, "Laporan ini untuk rumah yang mana?\n{$listText}\n\nBalas dengan angka pilihan Anda.");

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
            $result = $this->deepSeek->converse($history, self::SYSTEM_PROMPT);
        } catch (\Throwable $e) {
            Log::error('[ticket-chat] deepseek call failed', ['phone' => $phone, 'exception' => $e->getMessage()]);
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

        $categoryLabel = trim((string) ($result['category'] ?? ''));
        $description = trim((string) ($result['description'] ?? ''));
        $category = array_search($categoryLabel, self::CATEGORY_LABELS, true) ?: 'other';

        if ($description === '') {
            $history[] = ['role' => 'assistant', 'content' => 'Boleh diceritakan lagi, apa masalah yang ingin Anda laporkan?'];
            $conversation->history = $history;
            $conversation->last_message_at = now();
            $conversation->save();

            $this->reply($phone, 'Boleh diceritakan lagi, apa masalah yang ingin Anda laporkan?');

            return;
        }

        $conversation->history = $history;
        $this->finalizeTicket($conversation, $user, $category, $description);
    }

    private function handleUnitChoice(TicketChatConversation $conversation, string $text): void
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

        $this->reply($conversation->phone, 'Baik, sekarang ceritakan masalah yang ingin Anda laporkan.');
    }

    private function finalizeTicket(
        TicketChatConversation $conversation,
        User $user,
        string $category,
        string $description,
    ): void {
        $collected = $conversation->collected_fields ?? [];
        $categoryLabel = self::CATEGORY_LABELS[$category] ?? 'Lainnya';
        $subject = $categoryLabel.': '.(mb_strlen($description) > 40 ? mb_substr($description, 0, 40).'...' : $description);

        $ticket = DB::transaction(function () use ($conversation, $user, $collected, $category, $subject, $description) {
            $ticket = Ticket::create([
                'area_id' => $collected['area_id'],
                'unit_id' => $collected['unit_id'],
                'user_id' => $user->id,
                'category' => $category,
                'subject' => $subject,
                'status' => 'open',
                'source' => 'whatsapp_ai',
            ]);

            $ticket->messages()->create([
                'sender_type' => 'tenant',
                'user_id' => $user->id,
                'body' => $description,
            ]);

            $conversation->status = 'completed';
            $conversation->ticket_id = $ticket->id;
            $conversation->last_message_at = now();
            $conversation->save();

            return $ticket;
        });

        $this->notifier->notifyAdminsOfNewTicket($ticket);

        $this->reply($conversation->phone, "Laporan Anda sudah diterima!\n\n\"{$ticket->subject}\"\n\nKami akan update statusnya lewat aplikasi HunianID. Ketik \"lapor\" lagi kapan saja untuk membuat laporan baru.");
    }

    private function reply(string $phone, string $message): void
    {
        $this->waBlast->send($phone, $message);
    }
}
