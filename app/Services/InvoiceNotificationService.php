<?php

namespace App\Services;

use App\Models\Invoice;

/**
 * Single choke point for this feature's outbound WhatsApp sends, wrapping
 * WaBlastService the same way VisitorPassChatService and PhoneLoginController do.
 */
class InvoiceNotificationService
{
    public function __construct(private readonly WaBlastService $waBlast)
    {
    }

    public function sendCreatedBroadcast(Invoice $invoice): void
    {
        if (! $invoice->user->phone) {
            return;
        }

        $result = $this->waBlast->send($invoice->user->phone, $this->createdMessage($invoice));

        if ($result['ok']) {
            $invoice->update(['broadcast_sent_at' => now()]);
        }
    }

    public function sendDueReminder(Invoice $invoice): void
    {
        if (! $invoice->user->phone) {
            return;
        }

        $result = $this->waBlast->send($invoice->user->phone, $this->reminderMessage($invoice));

        if ($result['ok']) {
            $invoice->update(['reminder_sent_at' => now()]);
        }
    }

    private function createdMessage(Invoice $invoice): string
    {
        $memoLine = $invoice->memo ? "\n{$invoice->memo}" : '';

        return "Halo {$invoice->user->name}! Tagihan baru untuk Anda:\n\n".
            "{$this->categoryLabel($invoice)} — {$invoice->invoice_number}\n".
            "Nominal: {$this->rupiah($invoice->amount)}\n".
            "Jatuh tempo: {$this->formatDate($invoice->due_date)}".
            "{$memoLine}\n\n".
            "Silakan lakukan pembayaran sebelum jatuh tempo dan konfirmasi ke pengelola {$invoice->area->name}. Terima kasih.";
    }

    private function reminderMessage(Invoice $invoice): string
    {
        $daysLeft = $invoice->due_date ? now()->startOfDay()->diffInDays($invoice->due_date, false) : null;

        return "Halo {$invoice->user->name}, pengingat tagihan Anda akan jatuh tempo:\n\n".
            "{$this->categoryLabel($invoice)} — {$invoice->invoice_number}\n".
            "Nominal: {$this->rupiah($invoice->amount)}\n".
            "Jatuh tempo: {$this->formatDate($invoice->due_date)} ({$daysLeft} hari lagi)\n\n".
            "Mohon segera lakukan pembayaran dan konfirmasi ke pengelola {$invoice->area->name}. Terima kasih.";
    }

    private function categoryLabel(Invoice $invoice): string
    {
        return $invoice->category->name;
    }

    private function rupiah(float|string $amount): string
    {
        return 'Rp'.number_format((float) $amount, 0, ',', '.');
    }

    private const INDONESIAN_MONTHS = [
        1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr', 5 => 'Mei', 6 => 'Jun',
        7 => 'Jul', 8 => 'Ags', 9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des',
    ];

    private function formatDate(?\Carbon\CarbonInterface $date): string
    {
        if (! $date) {
            return '-';
        }

        return sprintf('%d %s %d', $date->day, self::INDONESIAN_MONTHS[$date->month], $date->year);
    }
}
