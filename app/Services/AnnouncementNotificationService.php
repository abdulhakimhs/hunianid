<?php

namespace App\Services;

use App\Models\Announcement;

/**
 * Single choke point for an announcement's outbound WhatsApp blast, wrapping
 * WaBlastService the same way InvoiceNotificationService does. Reuses
 * InvoiceTenantResolver despite its "Invoice" name — it's generically "resolve the
 * active tenants in an area," resolved fresh at send time rather than a snapshot.
 */
class AnnouncementNotificationService
{
    public function __construct(
        private readonly WaBlastService $waBlast,
        private readonly InvoiceTenantResolver $tenantResolver,
    ) {}

    public function broadcast(Announcement $announcement): void
    {
        if (! $announcement->send_whatsapp) {
            return;
        }

        $announcement->loadMissing('area.complex');

        $recipients = $this->tenantResolver
            ->resolve($announcement->area, 'area_all_units', null)
            ->pluck('user')
            ->unique('id');

        $sent = 0;

        foreach ($recipients as $user) {
            if (! $user->phone) {
                continue;
            }

            $result = $this->waBlast->send($user->phone, $this->message($announcement));

            if ($result['ok']) {
                $sent++;
            }
        }

        $announcement->update(['broadcast_sent_at' => now(), 'sent_count' => $sent]);
    }

    private function message(Announcement $announcement): string
    {
        return "📢 Pengumuman dari {$announcement->area->complex->name}-{$announcement->area->name}\n\n".
            "{$announcement->title}\n\n{$announcement->body}";
    }
}
