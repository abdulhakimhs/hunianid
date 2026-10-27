<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AreaMember;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Services\TicketNotificationService;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TicketsController extends Controller
{
    public function __construct(
        private readonly TicketNotificationService $notifier,
    ) {}

    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $tickets = Ticket::where('area_id', $area->id)
            ->with(['unit:id,unit_number,block', 'user:id,name,phone', 'assignedTo:id,name', 'messages'])
            ->latest()
            ->get()
            ->map(fn (Ticket $ticket) => [
                'id' => $ticket->id,
                'subject' => $ticket->subject,
                'category' => $ticket->category,
                'priority' => $ticket->priority,
                'status' => $ticket->status,
                'source' => $ticket->source,
                'createdAt' => $ticket->created_at->toISOString(),
                'lastActivityAt' => ($ticket->messages->last()?->created_at ?? $ticket->created_at)->toISOString(),
                'reporter' => ['id' => $ticket->user->id, 'name' => $ticket->user->name],
                'unit' => ['id' => $ticket->unit->id, 'label' => trim(($ticket->unit->block ?? '').' '.$ticket->unit->unit_number)],
                'assignedTo' => $ticket->assignedTo ? ['id' => $ticket->assignedTo->id, 'name' => $ticket->assignedTo->name] : null,
            ]);

        return Inertia::render('admin/tickets/index', [
            'tickets' => $tickets,
        ]);
    }

    public function show(Request $request, Ticket $ticket): Response
    {
        $area = $request->attributes->get('adminArea');

        if ($ticket->area_id !== $area->id) {
            abort(404);
        }

        $ticket->load(['messages.user', 'unit', 'user:id,name,phone', 'assignedTo:id,name']);

        return Inertia::render('admin/tickets/show', [
            'ticket' => [
                'id' => $ticket->id,
                'subject' => $ticket->subject,
                'category' => $ticket->category,
                'priority' => $ticket->priority,
                'status' => $ticket->status,
                'reporter' => [
                    'id' => $ticket->user->id,
                    'name' => $ticket->user->name,
                    'phone' => $ticket->user->phone,
                    'whatsappNumber' => $ticket->user->phone ? PhoneNumber::normalize($ticket->user->phone) : null,
                ],
                'unit' => ['id' => $ticket->unit->id, 'label' => trim(($ticket->unit->block ?? '').' '.$ticket->unit->unit_number)],
                'assignedTo' => $ticket->assignedTo ? ['id' => $ticket->assignedTo->id, 'name' => $ticket->assignedTo->name] : null,
                'activity' => $ticket->messages->map(fn (TicketMessage $message) => [
                    'id' => $message->id,
                    'sender' => $message->sender_type,
                    'staffName' => $message->sender_type === 'staff' ? $message->user?->name : null,
                    'body' => $message->body,
                    'photoUrl' => $message->photo_path
                        ? route('admin.tickets.photo', [$ticket, $message])
                        : null,
                    'isInternal' => $message->is_internal,
                    'sentAt' => $message->created_at->toISOString(),
                ])->values(),
            ],
            'staffOptions' => $this->staffOptions($area->id),
        ]);
    }

    public function updateStatus(Request $request, Ticket $ticket)
    {
        $area = $request->attributes->get('adminArea');

        if ($ticket->area_id !== $area->id) {
            abort(404);
        }

        $data = $request->validate([
            'status' => ['required', 'in:in_progress,closed'],
            'note' => ['nullable', 'string', 'max:500'],
            'photo' => [
                'nullable', 'file',
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
                'max:5120',
            ],
        ], [
            'photo.mimes' => __('Foto harus berupa JPG, PNG, atau WEBP.'),
            'photo.mimetypes' => __('Foto harus berupa JPG, PNG, atau WEBP.'),
            'photo.max' => __('Ukuran foto maksimal 5 MB.'),
        ]);

        $photoPath = $request->hasFile('photo')
            ? $request->file('photo')->store("ticket-photos/{$area->id}", 'local')
            : null;

        DB::transaction(function () use ($request, $ticket, $data, $photoPath) {
            $ticket->status = $data['status'];
            $ticket->last_followup_at = now();

            if ($data['status'] === 'closed') {
                $ticket->closed_at = now();
                $ticket->closed_by = $request->user()->id;
            }

            $ticket->save();

            $statusLabel = $data['status'] === 'closed' ? 'Selesai' : 'Diproses';
            $logBody = "Status diubah menjadi {$statusLabel}.";

            if (! empty($data['note'])) {
                $logBody .= ' '.$data['note'];
            }

            $ticket->messages()->create([
                'sender_type' => 'system',
                'body' => $logBody,
                'photo_path' => $photoPath,
            ]);
        });

        $this->notifier->notifyTenantOfStatusChange($ticket, $data['note'] ?? null, $photoPath !== null);

        return redirect()->route('admin.tickets.show', $ticket);
    }

    /**
     * Send a progress note to the tenant without changing status — covers the
     * "still in_progress but want to tell them what's happening" case that a pure
     * status-change action can't (status only moves forward to in_progress/closed).
     */
    public function sendUpdate(Request $request, Ticket $ticket)
    {
        $area = $request->attributes->get('adminArea');

        if ($ticket->area_id !== $area->id) {
            abort(404);
        }

        $data = $request->validate([
            'note' => ['required', 'string', 'max:500'],
            'photo' => [
                'nullable', 'file',
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
                'max:5120',
            ],
        ], [
            'photo.mimes' => __('Foto harus berupa JPG, PNG, atau WEBP.'),
            'photo.mimetypes' => __('Foto harus berupa JPG, PNG, atau WEBP.'),
            'photo.max' => __('Ukuran foto maksimal 5 MB.'),
        ]);

        $photoPath = $request->hasFile('photo')
            ? $request->file('photo')->store("ticket-photos/{$area->id}", 'local')
            : null;

        DB::transaction(function () use ($ticket, $data, $photoPath) {
            $ticket->last_followup_at = now();
            $ticket->save();

            $ticket->messages()->create([
                'sender_type' => 'system',
                'body' => "Update: {$data['note']}",
                'photo_path' => $photoPath,
            ]);
        });

        $this->notifier->notifyTenantOfProgressUpdate($ticket, $data['note'], $photoPath !== null);

        return redirect()->route('admin.tickets.show', $ticket);
    }

    public function assign(Request $request, Ticket $ticket)
    {
        $area = $request->attributes->get('adminArea');

        if ($ticket->area_id !== $area->id) {
            abort(404);
        }

        $data = $request->validate([
            'assigned_to' => ['nullable', 'integer'],
        ]);

        $assignee = null;

        if (! empty($data['assigned_to'])) {
            $assignee = AreaMember::where('area_id', $area->id)
                ->where('user_id', $data['assigned_to'])
                ->whereHas('role', fn ($q) => $q->whereIn('key_name', ['superadmin', 'staff']))
                ->with('user:id,name')
                ->first();

            abort_unless($assignee, 422);
        }

        DB::transaction(function () use ($ticket, $assignee, $data) {
            $ticket->assigned_to = $data['assigned_to'] ?? null;
            $ticket->last_followup_at = now();
            $ticket->save();

            $logBody = $assignee
                ? "Ditugaskan ke {$assignee->user->name}."
                : 'Penugasan dibatalkan.';

            $ticket->messages()->create([
                'sender_type' => 'system',
                'body' => $logBody,
            ]);
        });

        return redirect()->route('admin.tickets.show', $ticket);
    }

    public function setPriority(Request $request, Ticket $ticket)
    {
        $area = $request->attributes->get('adminArea');

        if ($ticket->area_id !== $area->id) {
            abort(404);
        }

        $data = $request->validate([
            'priority' => ['nullable', 'in:low,medium,high'],
        ]);

        $priorityLabels = ['low' => 'Rendah', 'medium' => 'Sedang', 'high' => 'Tinggi'];

        DB::transaction(function () use ($ticket, $data, $priorityLabels) {
            $ticket->priority = $data['priority'] ?? null;
            $ticket->last_followup_at = now();
            $ticket->save();

            $logBody = $data['priority']
                ? "Prioritas diatur ke {$priorityLabels[$data['priority']]}."
                : 'Prioritas dihapus.';

            $ticket->messages()->create([
                'sender_type' => 'system',
                'body' => $logBody,
            ]);
        });

        return redirect()->route('admin.tickets.show', $ticket);
    }

    public function addNote(Request $request, Ticket $ticket)
    {
        $area = $request->attributes->get('adminArea');

        if ($ticket->area_id !== $area->id) {
            abort(404);
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'photo' => [
                'nullable', 'file',
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
                'max:5120',
            ],
        ], [
            'photo.mimes' => __('Foto harus berupa JPG, PNG, atau WEBP.'),
            'photo.mimetypes' => __('Foto harus berupa JPG, PNG, atau WEBP.'),
            'photo.max' => __('Ukuran foto maksimal 5 MB.'),
        ]);

        $photoPath = $request->hasFile('photo')
            ? $request->file('photo')->store("ticket-photos/{$area->id}", 'local')
            : null;

        DB::transaction(function () use ($request, $ticket, $data, $photoPath) {
            $ticket->messages()->create([
                'sender_type' => 'staff',
                'user_id' => $request->user()->id,
                'body' => $data['body'],
                'photo_path' => $photoPath,
                'is_internal' => true,
            ]);

            $ticket->last_followup_at = now();
            $ticket->save();
        });

        return redirect()->route('admin.tickets.show', $ticket);
    }

    public function photo(Request $request, Ticket $ticket, TicketMessage $message)
    {
        $area = $request->attributes->get('adminArea');

        if ($ticket->area_id !== $area->id || $message->ticket_id !== $ticket->id) {
            abort(404);
        }

        return $message->photoResponse();
    }

    private function staffOptions(int $areaId): array
    {
        return AreaMember::where('area_id', $areaId)
            ->where('status', 'active')
            ->whereHas('role', fn ($q) => $q->whereIn('key_name', ['superadmin', 'staff']))
            ->with('user:id,name')
            ->get()
            ->map(fn (AreaMember $member) => ['id' => $member->user->id, 'name' => $member->user->name])
            ->values()
            ->all();
    }
}
