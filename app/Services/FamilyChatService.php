<?php

namespace App\Services;

use App\Exceptions\FamilyOwnershipException;
use App\Models\FamilyChatConversation;
use App\Models\UnitUser;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Orchestrates the WhatsApp AI family-member-management conversation: resolves who is
 * texting and which unit, shows a short numeric menu (tambah/lihat/hapus), hands
 * free-text "tambah" turns to DeepSeek to extract name+nomor WA, and performs every
 * mutation through FamilyService so the web/PWA form and this bot stay in sync.
 */
class FamilyChatService
{
    private const RESET_PHRASES = ['mulai ulang', 'batal', 'reset'];

    private const CONFIRM_WORDS = ['ya', 'iya', 'y'];

    private const SYSTEM_PROMPT = <<<'PROMPT'
        Kamu adalah asisten WhatsApp untuk menambahkan anggota keluarga penghuni di
        sebuah perumahan. Tugasmu HANYA mengumpulkan dari penghuni, dalam Bahasa
        Indonesia, ramah dan singkat:
        - name (nama anggota keluarga, wajib)
        - wa_number (nomor WhatsApp anggota keluarga, wajib)

        Balas HANYA dengan JSON valid, tanpa teks lain di luar JSON, dengan bentuk
        persis salah satu dari dua ini:
        {"action":"ask","message":"<pertanyaan lanjutan dalam Bahasa Indonesia>"}
        {"action":"complete","name":"...","wa_number":"..."}

        Jangan mengarang data yang belum diberikan pengguna. Jika pesan pertama sudah
        berisi nama dan nomor lengkap, langsung balas "complete". Jika ada yang masih
        kosong, tanyakan HANYA field yang masih kosong dalam satu pertanyaan singkat.
        PROMPT;

    public function __construct(
        private readonly WaBlastService $waBlast,
        private readonly DeepSeekService $deepSeek,
        private readonly FamilyService $families,
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

        $conversation = FamilyChatConversation::firstOrNew(['phone' => $phone]);
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
            $this->reply($phone, 'Baik, dibatalkan. Ketik "keluarga" kapan saja untuk mulai lagi.');

            return;
        }

        if ($conversation->status === 'completed') {
            $conversation->resetState();
        }

        match ($conversation->status) {
            'awaiting_unit_choice' => $this->handleUnitChoice($conversation, $text),
            'awaiting_action_choice' => $this->handleActionChoice($conversation, $user, $text),
            'awaiting_remove_choice' => $this->handleRemoveChoice($conversation, $text),
            'awaiting_remove_confirm' => $this->handleRemoveConfirm($conversation, $user, $text),
            'awaiting_add_repeat' => $this->handleAddRepeat($conversation, $text),
            default => $this->handleCollecting($conversation, $user, $text),
        };
    }

    private function handleCollecting(FamilyChatConversation $conversation, User $user, string $text): void
    {
        $collected = $conversation->collected_fields ?? [];

        if (! isset($collected['unit_id'])) {
            $units = $this->families->activeUnitsFor($user);

            if ($units->isEmpty()) {
                $this->reply($conversation->phone, 'Anda belum terdaftar sebagai penghuni aktif di unit manapun. Silakan hubungi admin perumahan Anda.');

                return;
            }

            if ($units->count() > 1) {
                $options = $this->buildUnitOptions($units);
                $collected['unit_options'] = $options;
                $conversation->collected_fields = $collected;
                $conversation->status = 'awaiting_unit_choice';
                $conversation->last_message_at = now();
                $conversation->save();

                $this->reply($conversation->phone, "Ini untuk rumah yang mana?\n{$this->formatOptions($options)}\n\nBalas dengan angka pilihan Anda.");

                return;
            }

            $unit = $units->first();
            $conversation->collected_fields = [
                'unit_id' => $unit->id,
                'unit_label' => trim("{$unit->block} {$unit->unit_number}"),
            ];
            $this->showActionMenu($conversation);

            return;
        }

        if (($collected['action'] ?? null) !== 'add') {
            // Safety fallback — shouldn't normally be reached, since the unit is only
            // ever resolved right before the action menu is shown.
            $this->showActionMenu($conversation);

            return;
        }

        $this->collectAddFields($conversation, $user, $text);
    }

    private function handleUnitChoice(FamilyChatConversation $conversation, string $text): void
    {
        $collected = $conversation->collected_fields ?? [];
        $options = $collected['unit_options'] ?? [];

        $chosenIndex = (int) trim($text);
        $match = collect($options)->firstWhere('index', $chosenIndex);

        if (! $match) {
            $this->reply($conversation->phone, "Maaf, saya tidak mengerti pilihan Anda. Balas dengan angka saja, contoh: 1\n\n{$this->formatOptions($options)}");

            return;
        }

        $conversation->collected_fields = [
            'unit_id' => $match['unit_id'],
            'unit_label' => $match['label'],
        ];
        $this->showActionMenu($conversation);
    }

    private function handleActionChoice(FamilyChatConversation $conversation, User $user, string $text): void
    {
        $collected = $conversation->collected_fields ?? [];
        $unitId = (int) $collected['unit_id'];
        $unitLabel = $collected['unit_label'];
        $choice = trim($text);

        if ($choice === '1') {
            $collected['action'] = 'add';
            $conversation->collected_fields = $collected;
            $conversation->status = 'collecting';
            $conversation->last_message_at = now();
            $conversation->save();

            $this->reply($conversation->phone, 'Oke, siapa nama dan nomor WA anggota keluarga yang mau ditambahkan? Bisa ditulis sekaligus, misalnya: Budi 081234567890');

            return;
        }

        if ($choice === '2') {
            $this->listMembers($conversation, $user, $unitId, $unitLabel);

            return;
        }

        if ($choice === '3') {
            $this->promptRemoveChoice($conversation, $user, $unitId, $unitLabel);

            return;
        }

        $this->reply($conversation->phone, "Maaf, saya tidak mengerti pilihan Anda.\n\n{$this->menuText($unitLabel)}");
    }

    private function collectAddFields(FamilyChatConversation $conversation, User $user, string $text): void
    {
        $history = $conversation->history ?? [];
        $history[] = ['role' => 'user', 'content' => $text];

        try {
            $result = $this->deepSeek->converse($history, self::SYSTEM_PROMPT);
        } catch (\Throwable $e) {
            Log::error('[family-chat] deepseek call failed', ['phone' => $conversation->phone, 'exception' => $e->getMessage()]);
            $this->reply($conversation->phone, 'Maaf, sistem sedang sibuk. Silakan kirim ulang pesan Anda sebentar lagi.');

            return;
        }

        if (($result['action'] ?? null) === 'ask') {
            $history[] = ['role' => 'assistant', 'content' => (string) $result['message']];
            $conversation->history = $history;
            $conversation->last_message_at = now();
            $conversation->save();

            $this->reply($conversation->phone, (string) $result['message']);

            return;
        }

        $name = trim((string) ($result['name'] ?? ''));
        $waNumber = trim((string) ($result['wa_number'] ?? ''));

        if ($name === '' || $waNumber === '') {
            $history[] = ['role' => 'assistant', 'content' => 'Boleh diulangi, nama dan nomor WA-nya apa ya?'];
            $conversation->history = $history;
            $conversation->last_message_at = now();
            $conversation->save();

            $this->reply($conversation->phone, 'Boleh diulangi, nama dan nomor WA-nya apa ya?');

            return;
        }

        $conversation->history = $history;
        $this->finalizeAdd($conversation, $user, $name, $waNumber);
    }

    private function finalizeAdd(FamilyChatConversation $conversation, User $user, string $name, string $waNumber): void
    {
        $collected = $conversation->collected_fields ?? [];
        $unitId = (int) $collected['unit_id'];
        $unitLabel = $collected['unit_label'];

        try {
            $this->families->addMember($user, $unitId, $name, $waNumber);
        } catch (ValidationException $e) {
            $conversation->collected_fields = $collected;
            $conversation->status = 'awaiting_add_repeat';
            $conversation->history = null;
            $conversation->last_message_at = now();
            $conversation->save();

            $this->reply($conversation->phone, "{$name} sudah terdaftar sebagai anggota keluarga di unit ini. Mau coba yang lain? Ketik \"ya\" atau \"selesai\".");

            return;
        } catch (FamilyOwnershipException $e) {
            $conversation->resetState();
            $conversation->last_message_at = now();
            $conversation->save();
            $this->reply($conversation->phone, 'Maaf, terjadi kendala. Silakan ketik "keluarga" untuk mulai lagi.');

            return;
        }

        $conversation->collected_fields = $collected;
        $conversation->status = 'awaiting_add_repeat';
        $conversation->history = null;
        $conversation->last_message_at = now();
        $conversation->save();

        $this->reply($conversation->phone, "Berhasil! {$name} ({$waNumber}) sudah ditambahkan sebagai anggota keluarga untuk unit {$unitLabel}. Mau tambah anggota lain? Ketik \"ya\" atau \"selesai\".");
    }

    private function handleAddRepeat(FamilyChatConversation $conversation, string $text): void
    {
        if (in_array(mb_strtolower(trim($text)), self::CONFIRM_WORDS, true)) {
            $conversation->status = 'collecting';
            $conversation->last_message_at = now();
            $conversation->save();

            $this->reply($conversation->phone, 'Oke, siapa nama dan nomor WA anggota keluarga yang mau ditambahkan? Bisa ditulis sekaligus, misalnya: Budi 081234567890');

            return;
        }

        $conversation->status = 'completed';
        $conversation->last_message_at = now();
        $conversation->save();

        $this->reply($conversation->phone, 'Sip, sampai jumpa! Ketik "keluarga" lagi kalau mau kelola anggota keluarga ya.');
    }

    private function listMembers(FamilyChatConversation $conversation, User $user, int $unitId, string $unitLabel): void
    {
        $members = $this->families->listMembers($user, $unitId);

        $conversation->status = 'completed';
        $conversation->last_message_at = now();
        $conversation->save();

        if ($members->isEmpty()) {
            $this->reply($conversation->phone, "Belum ada anggota keluarga terdaftar untuk unit {$unitLabel}.");

            return;
        }

        $listText = $members->values()
            ->map(fn ($m, $i) => ($i + 1).". {$m->user->name} — {$m->user->phone}")
            ->implode("\n");

        $this->reply($conversation->phone, "Anggota keluarga di unit {$unitLabel}:\n{$listText}\n\nKetik \"keluarga\" lagi kalau mau tambah/hapus.");
    }

    private function promptRemoveChoice(FamilyChatConversation $conversation, User $user, int $unitId, string $unitLabel): void
    {
        $members = $this->families->listMembers($user, $unitId);

        if ($members->isEmpty()) {
            $conversation->status = 'completed';
            $conversation->last_message_at = now();
            $conversation->save();

            $this->reply($conversation->phone, "Belum ada anggota keluarga terdaftar untuk unit {$unitLabel}.");

            return;
        }

        $options = $members->values()->map(fn ($m, $i) => [
            'index' => $i + 1,
            'unit_user_id' => $m->id,
            'name' => $m->user->name,
            'label' => "{$m->user->name} — {$m->user->phone}",
        ])->all();

        $collected = $conversation->collected_fields ?? [];
        $collected['remove_options'] = $options;
        $conversation->collected_fields = $collected;
        $conversation->status = 'awaiting_remove_choice';
        $conversation->last_message_at = now();
        $conversation->save();

        $listText = collect($options)->map(fn ($o) => "{$o['index']}. {$o['label']}")->implode("\n");
        $this->reply($conversation->phone, "Anggota mana yang mau dihapus?\n{$listText}\n\nBalas dengan angka, atau ketik \"batal\".");
    }

    private function handleRemoveChoice(FamilyChatConversation $conversation, string $text): void
    {
        $collected = $conversation->collected_fields ?? [];
        $options = $collected['remove_options'] ?? [];

        $chosenIndex = (int) trim($text);
        $match = collect($options)->firstWhere('index', $chosenIndex);

        if (! $match) {
            $listText = collect($options)->map(fn ($o) => "{$o['index']}. {$o['label']}")->implode("\n");
            $this->reply($conversation->phone, "Maaf, saya tidak mengerti pilihan Anda. Balas dengan angka saja, contoh: 1\n\n{$listText}");

            return;
        }

        $collected['remove_target_id'] = $match['unit_user_id'];
        $collected['remove_target_name'] = $match['name'];
        unset($collected['remove_options']);

        $conversation->collected_fields = $collected;
        $conversation->status = 'awaiting_remove_confirm';
        $conversation->last_message_at = now();
        $conversation->save();

        $unitLabel = $collected['unit_label'];
        $this->reply($conversation->phone, "Yakin hapus {$match['name']} dari unit {$unitLabel}? Balas \"ya\" untuk konfirmasi, atau \"batal\".");
    }

    private function handleRemoveConfirm(FamilyChatConversation $conversation, User $user, string $text): void
    {
        $collected = $conversation->collected_fields ?? [];
        $unitLabel = $collected['unit_label'];
        $name = $collected['remove_target_name'] ?? 'anggota ini';

        if (! in_array(mb_strtolower(trim($text)), self::CONFIRM_WORDS, true)) {
            $conversation->status = 'completed';
            $conversation->last_message_at = now();
            $conversation->save();

            $this->reply($conversation->phone, 'Baik, dibatalkan.');

            return;
        }

        try {
            $family = UnitUser::find($collected['remove_target_id']);

            if ($family) {
                $this->families->removeMember($user, $family);
            }
        } catch (FamilyOwnershipException $e) {
            $conversation->resetState();
            $conversation->last_message_at = now();
            $conversation->save();
            $this->reply($conversation->phone, 'Maaf, terjadi kendala. Silakan ketik "keluarga" untuk mulai lagi.');

            return;
        }

        $conversation->status = 'completed';
        $conversation->last_message_at = now();
        $conversation->save();

        $this->reply($conversation->phone, "{$name} sudah dihapus dari unit {$unitLabel}. Ketik \"keluarga\" lagi kalau butuh bantuan lain.");
    }

    private function showActionMenu(FamilyChatConversation $conversation): void
    {
        $conversation->status = 'awaiting_action_choice';
        $conversation->last_message_at = now();
        $conversation->save();

        $this->reply($conversation->phone, $this->menuText($conversation->collected_fields['unit_label']));
    }

    private function menuText(string $unitLabel): string
    {
        return "Baik, untuk unit {$unitLabel} ini, Anda mau apa?\n1. Tambah anggota keluarga\n2. Lihat daftar anggota keluarga\n3. Hapus anggota keluarga\n\nBalas dengan angka pilihan Anda, atau ketik \"batal\" untuk keluar.";
    }

    private function buildUnitOptions($units): array
    {
        return $units->values()->map(fn ($unit, $i) => [
            'index' => $i + 1,
            'unit_id' => $unit->id,
            'label' => trim("{$unit->block} {$unit->unit_number}"),
        ])->all();
    }

    private function formatOptions(array $options): string
    {
        return collect($options)->map(fn ($o) => "{$o['index']}. {$o['label']}")->implode("\n");
    }

    private function reply(string $phone, string $message): void
    {
        $this->waBlast->send($phone, $message);
    }
}
