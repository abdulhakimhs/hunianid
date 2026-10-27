<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\Invoice;
use App\Models\PaymentGatewaySetting;
use App\Models\Plan;
use App\Models\Ticket;
use App\Models\User;
use App\Models\VisitorPass;
use App\Services\MembershipContext;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptions,
    ) {}

    public function __invoke(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $current = MembershipContext::current($user, $request);

        if ($current && $current->role->key_name === 'security') {
            return redirect()->route('security.dashboard');
        }

        $guidance = $current ? $this->guidanceFor($user, $current) : null;

        // A resident with nothing pending (profile complete, approved, unit
        // confirmed) belongs on the tenant PWA, not the pengelola-oriented
        // admin dashboard. Residents who still have something to resolve
        // stay here, since the tenant PWA has no wiring yet for those states.
        if ($current && $current->role->key_name === 'resident' && ($guidance['type'] ?? null) === 'penghuni_active') {
            return redirect()->route('tenant.dashboard');
        }

        $isPengelola = $current && in_array($current->role->key_name, ['superadmin', 'staff'], true);

        // An admin whose area isn't paid up (just registered on a paid plan and
        // hasn't checked out yet, or a trial that ran out) gets ONLY a payment
        // prompt here — no operational widgets, since every other admin route is
        // already gated behind EnsureSubscriptionActive and would just bounce
        // them to the same upsell screen anyway.
        $paymentRequired = $isPengelola ? $this->paymentRequiredFor($current->area) : null;

        return Inertia::render('dashboard', [
            'guidance' => $paymentRequired ? null : $guidance,
            'status' => $request->session()->get('status'),
            'paymentRequired' => $paymentRequired,
            ...($isPengelola && ! $paymentRequired ? $this->operationalWidgets($current->area_id) : $this->emptyOperationalWidgets()),
        ]);
    }

    private function paymentRequiredFor(Area $area): ?array
    {
        if ($this->subscriptions->isActive($area)) {
            return null;
        }

        $subscription = $area->subscription?->load('plan');
        $gateway = PaymentGatewaySetting::current();

        return [
            'status' => $subscription->status ?? 'expired',
            'plan' => $subscription?->plan,
            'plans' => Plan::where('is_self_service', true)
                ->whereNotNull('price_monthly')
                ->orderBy('sort_order')
                ->get(),
            'midtransClientKey' => $gateway?->clientKey(),
            'midtransMode' => $gateway?->mode ?? 'sandbox',
        ];
    }

    private function operationalWidgets(int $areaId): array
    {
        $openInvoicesQuery = Invoice::where('area_id', $areaId)->whereIn('status', ['unpaid', 'overdue']);
        $openInvoices = $openInvoicesQuery->clone()
            ->with(['unit:id,unit_number,block', 'user:id,name'])
            ->orderBy('due_date')
            ->limit(5)
            ->get()
            ->map(fn (Invoice $invoice) => [
                'id' => $invoice->id,
                'invoiceNumber' => $invoice->invoice_number,
                'dueDate' => $invoice->due_date?->toDateString(),
                'amount' => (float) $invoice->amount,
                'status' => $invoice->status,
                'tenant' => ['id' => $invoice->user->id, 'name' => $invoice->user->name],
                'unit' => ['id' => $invoice->unit->id, 'label' => trim(($invoice->unit->block ?? '').' '.$invoice->unit->unit_number)],
            ]);

        $openTicketsQuery = Ticket::where('area_id', $areaId)->where('status', '!=', 'closed');
        $openTickets = $openTicketsQuery->clone()
            ->with(['unit:id,unit_number,block', 'user:id,name'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Ticket $ticket) => [
                'id' => $ticket->id,
                'subject' => $ticket->subject,
                'status' => $ticket->status,
                'createdAt' => $ticket->created_at->toISOString(),
                'reporter' => ['id' => $ticket->user->id, 'name' => $ticket->user->name],
                'unit' => ['id' => $ticket->unit->id, 'label' => trim(($ticket->unit->block ?? '').' '.$ticket->unit->unit_number)],
            ]);

        $activePassesQuery = VisitorPass::where('area_id', $areaId)
            ->where('status', 'pending')
            ->where('valid_until', '>', Carbon::now());
        $activeVisitorPasses = $activePassesQuery->clone()
            ->with(['unit:id,unit_number,block'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (VisitorPass $pass) => [
                'id' => $pass->id,
                'guestName' => $pass->guest_name,
                'validUntil' => $pass->valid_until?->toIso8601String(),
                'unit' => trim(($pass->unit?->block ?? '').' '.($pass->unit?->unit_number ?? '')) ?: '—',
            ]);

        return [
            'openInvoices' => $openInvoices,
            'openInvoicesCount' => $openInvoicesQuery->count(),
            'openTickets' => $openTickets,
            'openTicketsCount' => $openTicketsQuery->count(),
            'activeVisitorPasses' => $activeVisitorPasses,
            'activeVisitorPassesCount' => $activePassesQuery->count(),
        ];
    }

    private function emptyOperationalWidgets(): array
    {
        return [
            'openInvoices' => [],
            'openInvoicesCount' => 0,
            'openTickets' => [],
            'openTicketsCount' => 0,
            'activeVisitorPasses' => [],
            'activeVisitorPassesCount' => 0,
        ];
    }

    private function guidanceFor(User $user, AreaMember $current): ?array
    {
        if ($user->profile_completed_at === null) {
            return ['type' => 'complete_profile'];
        }

        $area = $current->area;

        if ($current->role->key_name === 'superadmin' || $current->role->key_name === 'staff') {
            $hasActiveInvite = $area->invites()->where('status', 'active')->exists();

            if (! $hasActiveInvite) {
                return [
                    'type' => 'pengelola_new',
                    'areaId' => $area->id,
                    'areaName' => $area->name,
                ];
            }

            return null;
        }

        if ($current->role->key_name !== 'resident') {
            return null;
        }

        $inUnclaimedArea = $area->status === 'unclaimed';
        // A resident with status === 'pending_approval' (outside an unclaimed area)
        // never reaches this code — the `pending.approval` middleware redirects them
        // to the dedicated waiting page before the dashboard route resolves.
        $pendingUnitConfirmation = $user->units()->wherePivot('status', 'pending')->exists();

        if ($inUnclaimedArea && $pendingUnitConfirmation) {
            return ['type' => 'penghuni_unclaimed_and_pending_unit', 'areaId' => $area->id, 'areaName' => $area->name];
        }

        if ($inUnclaimedArea) {
            return ['type' => 'penghuni_unclaimed', 'areaId' => $area->id, 'areaName' => $area->name];
        }

        if ($pendingUnitConfirmation) {
            return ['type' => 'penghuni_pending_unit', 'areaId' => $area->id, 'areaName' => $area->name];
        }

        return ['type' => 'penghuni_active', 'areaId' => $area->id, 'areaName' => $area->name];
    }
}
