<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Invoice;
use App\Models\PanicAlert;
use App\Models\Ticket;
use App\Models\Unit;
use App\Models\VisitorPass;

class UnitsMapService
{
    /**
     * Assembles the per-unit payload for one area's units map — one place shared by
     * both the initial Inertia render and the polling endpoint, so the two never drift.
     */
    public function buildPayload(Area $area): array
    {
        $units = Unit::where('area_id', $area->id)
            ->with(['residents' => fn ($q) => $q->wherePivot('status', 'active')])
            ->get();

        $openTicketCounts = Ticket::where('area_id', $area->id)
            ->whereIn('status', ['open', 'in_progress'])
            ->get()
            ->countBy('unit_id');

        $overdueInvoiceCounts = Invoice::where('area_id', $area->id)
            ->where('status', 'overdue')
            ->get()
            ->countBy('unit_id');

        $visitorsTodayCounts = VisitorPass::where('area_id', $area->id)
            ->whereDate('valid_from', today())
            ->get()
            ->countBy('unit_id');

        $activePanicsByUnit = PanicAlert::where('area_id', $area->id)
            ->whereNull('resolved_at')
            ->with('user:id,name')
            ->latest()
            ->get()
            ->unique('unit_id')
            ->keyBy('unit_id');

        $units = $units->map(fn (Unit $unit) => $this->mapUnit(
            $unit,
            $openTicketCounts->get($unit->id, 0),
            $overdueInvoiceCounts->get($unit->id, 0),
            $visitorsTodayCounts->get($unit->id, 0),
            $activePanicsByUnit->get($unit->id),
        ))->values();

        return [
            'units' => $units,
            'unpinnedCount' => $units->where('hasPin', false)->count(),
        ];
    }

    private function mapUnit(
        Unit $unit,
        int $openTicketCount,
        int $overdueInvoiceCount,
        int $visitorsTodayCount,
        ?PanicAlert $activePanic,
    ): array {
        $resident = $unit->residents->first(fn ($u) => $u->pivot->relation === 'owner')
            ?? $unit->residents->first();

        return [
            'id' => $unit->id,
            'unitNumber' => $unit->unit_number,
            'block' => $unit->block,
            'label' => trim(($unit->block ?? '').' '.$unit->unit_number),
            'status' => $unit->status,
            'latitude' => $unit->latitude !== null ? (float) $unit->latitude : null,
            'longitude' => $unit->longitude !== null ? (float) $unit->longitude : null,
            'hasPin' => $unit->hasPin(),
            'resident' => $resident ? [
                'name' => $resident->name,
                'phone' => $resident->phone,
                'relation' => $resident->pivot->relation,
            ] : null,
            'familyMemberCount' => $unit->residents->count(),
            'openTicketCount' => $openTicketCount,
            'overdueInvoiceCount' => $overdueInvoiceCount,
            'visitorsTodayCount' => $visitorsTodayCount,
            'activePanicAlert' => $activePanic ? [
                'id' => $activePanic->id,
                'reason' => $activePanic->reason,
                'triggeredAt' => $activePanic->created_at->toIso8601String(),
                'tenantName' => $activePanic->user?->name,
            ] : null,
        ];
    }
}
