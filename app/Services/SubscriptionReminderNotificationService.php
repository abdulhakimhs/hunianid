<?php

namespace App\Services;

use App\Models\Subscription;

/**
 * Single choke point for trial-reminder outbound WhatsApp sends, wrapping
 * WaBlastService the same way InvoiceNotificationService does.
 */
class SubscriptionReminderNotificationService
{
    public function __construct(private readonly WaBlastService $waBlast)
    {
    }

    public function sendReminder(Subscription $subscription): void
    {
        $recipient = $subscription->area->areaMembers()
            ->where('status', 'active')
            ->whereHas('role', fn ($q) => $q->where('key_name', 'superadmin'))
            ->with('user')
            ->first();

        if (! $recipient || ! $recipient->user->phone) {
            return;
        }

        $result = $this->waBlast->send($recipient->user->phone, $this->reminderMessage($subscription));

        if ($result['ok']) {
            $subscription->update(['trial_reminder_sent_at' => now()]);
        }
    }

    private function reminderMessage(Subscription $subscription): string
    {
        $daysLeft = now()->startOfDay()->diffInDays($subscription->trial_ends_at, false);
        $planName = $subscription->plan->name ?? 'HunianID';

        return "Halo pengurus {$subscription->area->name}! Masa coba gratis paket {$planName} Anda akan berakhir dalam {$daysLeft} hari.\n\n".
            "Jangan sampai akses terkunci — segera selesaikan pembayaran di halaman Paket & Pembayaran:\n".
            url('/admin/billing')."\n\n".
            'Terima kasih sudah menggunakan HunianID.';
    }
}
