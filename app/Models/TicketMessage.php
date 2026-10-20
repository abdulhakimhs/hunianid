<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

#[Fillable(['ticket_id', 'sender_type', 'user_id', 'body', 'photo_path', 'is_internal'])]
class TicketMessage extends Model
{
    protected function casts(): array
    {
        return [
            'is_internal' => 'boolean',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Stream the attached photo from the private disk. Callers must authorize first.
     */
    public function photoResponse(): StreamedResponse
    {
        $disk = Storage::disk('local');

        if (! $this->photo_path || ! $disk->exists($this->photo_path)) {
            abort(404);
        }

        return $disk->response($this->photo_path, null, [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
