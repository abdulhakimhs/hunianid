<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Services\TicketNotificationService;
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
        $user = $request->user();

        $tickets = Ticket::where('user_id', $user->id)
            ->with('messages')
            ->latest()
            ->get()
            ->map(fn (Ticket $ticket) => $this->mapListRow($ticket));

        return Inertia::render('tenant/tickets/index', [
            'tickets' => $tickets,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $unit = $user->units()->wherePivot('status', 'active')->first(['units.id', 'units.area_id']);

        if (! $unit) {
            abort(404);
        }

        $data = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'category' => ['required', 'in:maintenance,security,cleanliness,other'],
            'description' => ['required', 'string', 'max:5000'],
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
            ? $request->file('photo')->store("ticket-photos/{$unit->area_id}", 'local')
            : null;

        $ticket = DB::transaction(function () use ($user, $unit, $data, $photoPath) {
            $ticket = Ticket::create([
                'area_id' => $unit->area_id,
                'unit_id' => $unit->id,
                'user_id' => $user->id,
                'category' => $data['category'],
                'subject' => $data['subject'],
                'status' => 'open',
                'source' => 'web',
            ]);

            $ticket->messages()->create([
                'sender_type' => 'tenant',
                'user_id' => $user->id,
                'body' => $data['description'],
                'photo_path' => $photoPath,
            ]);

            return $ticket;
        });

        $this->notifier->notifyAdminsOfNewTicket($ticket);

        return redirect()->route('tenant.tickets.show', $ticket);
    }

    public function show(Request $request, Ticket $ticket): Response
    {
        if ($ticket->user_id !== $request->user()->id) {
            abort(404);
        }

        $ticket->update(['tenant_last_read_at' => now()]);
        $ticket->load('messages.user');

        return Inertia::render('tenant/tickets/show', [
            'ticket' => $this->mapDetail($ticket),
        ]);
    }

    public function close(Request $request, Ticket $ticket)
    {
        if ($ticket->user_id !== $request->user()->id) {
            abort(404);
        }

        if ($ticket->status !== 'closed') {
            $ticket->update([
                'status' => 'closed',
                'closed_at' => now(),
                'closed_by' => $request->user()->id,
            ]);

            $ticket->messages()->create([
                'sender_type' => 'system',
                'body' => 'Tiket ditutup oleh penghuni.',
            ]);
        }

        return redirect()->route('tenant.tickets.show', $ticket);
    }

    public function photo(Request $request, Ticket $ticket, TicketMessage $message)
    {
        if ($ticket->user_id !== $request->user()->id || $message->ticket_id !== $ticket->id) {
            abort(404);
        }

        return $message->photoResponse();
    }

    private function mapListRow(Ticket $ticket): array
    {
        $last = $ticket->messages->reject(fn (TicketMessage $message) => $message->is_internal)->last();

        return [
            'id' => $ticket->id,
            'subject' => $ticket->subject,
            'category' => $ticket->category,
            'status' => $ticket->status,
            'lastActivity' => $last?->body ?? '',
            'lastActivityAt' => ($last?->created_at ?? $ticket->created_at)->toISOString(),
            'hasUnreadUpdate' => $last
                && $last->sender_type !== 'tenant'
                && (! $ticket->tenant_last_read_at || $last->created_at->gt($ticket->tenant_last_read_at)),
        ];
    }

    private function mapDetail(Ticket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'subject' => $ticket->subject,
            'status' => $ticket->status,
            'activity' => $ticket->messages
                ->reject(fn (TicketMessage $message) => $message->is_internal)
                ->map(fn (TicketMessage $message) => [
                    'id' => $message->id,
                    'sender' => $message->sender_type,
                    'body' => $message->body,
                    'photoUrl' => $message->photo_path
                        ? route('tenant.tickets.photo', [$ticket, $message])
                        : null,
                    'sentAt' => $message->created_at->toISOString(),
                ])->values(),
        ];
    }
}
