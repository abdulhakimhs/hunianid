<?php

namespace App\Services;

use App\Models\AreaMember;
use App\Models\Ticket;

/**
 * Single choke point for ticket-related outbound WhatsApp messages, mirroring
 * AnnouncementNotificationService/InvoiceNotificationService. There is no in-app
 * notification bell anywhere in this codebase, so "notify RT/pengelola" and "notify
 * the tenant" both mean an outbound WaBlastService text — fire-and-forget, no
 * *_sent_at tracking column, since these fire repeatedly per ticket (unlike the
 * one-shot invoice/announcement broadcasts).
 */
class TicketNotificationService
{
    private const CATEGORY_LABELS = [
        'maintenance' => 'Perbaikan',
        'security' => 'Keamanan',
        'cleanliness' => 'Kebersihan',
        'other' => 'Lainnya',
    ];

    public function __construct(
        private readonly WaBlastService $waBlast,
    ) {}

    public function notifyAdminsOfNewTicket(Ticket $ticket): void
    {
        $ticket->loadMissing(['unit', 'user']);

        $unitLabel = trim(($ticket->unit->block ?? '').' '.$ticket->unit->unit_number);
        $categoryLabel = self::CATEGORY_LABELS[$ticket->category] ?? $ticket->category;

        $message = "🛠️ Laporan baru: {$ticket->subject}\n\n".
            "Kategori: {$categoryLabel}\n".
            "Unit: {$unitLabel}\n".
            "Pelapor: {$ticket->user->name}\n\n".
            'Balas di dashboard admin: menu Tiket & Komplain.';

        $this->notifyAreaAdmins($ticket->area_id, $message);
    }

    /**
     * Fires on every admin status change — this is the one WA message the tenant
     * actually receives now that in-app chat replies are gone. $note is the optional
     * short text staff attach to the status change; it's the only staff-authored
     * content that reaches the tenant outside a direct WhatsApp conversation.
     */
    public function notifyTenantOfStatusChange(Ticket $ticket, ?string $note, bool $hasPhoto = false): void
    {
        $ticket->loadMissing('user');

        if (! $ticket->user->phone) {
            return;
        }

        $statusLabel = match ($ticket->status) {
            'in_progress' => 'sedang diproses',
            'closed' => 'ditandai selesai',
            default => 'diperbarui',
        };

        $text = "🔧 Laporan Anda \"{$ticket->subject}\" {$statusLabel}.";

        if ($note) {
            $text .= "\n\nCatatan: {$note}";
        }

        if ($hasPhoto) {
            $text .= "\n\n📷 Ada foto bukti terlampir, buka aplikasi untuk melihatnya.";
        }

        $text .= "\n\nBuka aplikasi HunianID > Tiket untuk melihat detailnya.";

        $this->waBlast->send($ticket->user->phone, $text);
    }

    /**
     * A standalone progress note sent while the ticket stays in_progress — distinct
     * from notifyTenantOfStatusChange, which only fires alongside an actual status
     * transition.
     */
    public function notifyTenantOfProgressUpdate(Ticket $ticket, string $note, bool $hasPhoto = false): void
    {
        $ticket->loadMissing('user');

        if (! $ticket->user->phone) {
            return;
        }

        $text = "📋 Update untuk laporan Anda \"{$ticket->subject}\":\n\n{$note}";

        if ($hasPhoto) {
            $text .= "\n\n📷 Ada foto bukti terlampir, buka aplikasi untuk melihatnya.";
        }

        $text .= "\n\nBuka aplikasi HunianID > Tiket untuk melihat detailnya.";

        $this->waBlast->send($ticket->user->phone, $text);
    }

    /**
     * Escalation reminder for a ticket that's gone stale without staff follow-up —
     * sent to whoever's assigned, or all area admins if nobody's been assigned yet.
     */
    public function notifyEscalation(Ticket $ticket): void
    {
        $ticket->loadMissing('assignedTo', 'unit');

        $unitLabel = trim(($ticket->unit->block ?? '').' '.$ticket->unit->unit_number);
        $text = "⏰ Tiket #{$ticket->id} ({$ticket->subject}, unit {$unitLabel}) belum ditindaklanjuti. ".
            'Mohon dicek di menu Tiket & Komplain.';

        if ($ticket->assignedTo && $ticket->assignedTo->phone) {
            $this->waBlast->send($ticket->assignedTo->phone, $text);

            return;
        }

        $this->notifyAreaAdmins($ticket->area_id, $text);
    }

    private function notifyAreaAdmins(int $areaId, string $message): void
    {
        $admins = AreaMember::where('area_id', $areaId)
            ->where('status', 'active')
            ->whereHas('role', fn ($q) => $q->whereIn('key_name', ['superadmin', 'staff']))
            ->with('user')
            ->get();

        foreach ($admins as $admin) {
            if (! $admin->user->phone) {
                continue;
            }

            $this->waBlast->send($admin->user->phone, $message);
        }
    }
}
