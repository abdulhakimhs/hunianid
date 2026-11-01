<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'subscription_id', 'order_id', 'gross_amount', 'billing_cycle', 'status',
    'midtrans_transaction_id', 'midtrans_transaction_status', 'payment_type',
    'snap_token', 'paid_at', 'applied_at', 'raw_notification',
])]
class SubscriptionPayment extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PAID = 'paid';

    public const STATUS_FAILED = 'failed';

    public const STATUS_SUPERSEDED = 'superseded';

    protected function casts(): array
    {
        return [
            'paid_at' => 'datetime',
            'applied_at' => 'datetime',
            'raw_notification' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Subscription, $this>
     */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /**
     * @param  Builder<SubscriptionPayment>  $query
     * @return Builder<SubscriptionPayment>
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    /**
     * A payment whose outcome is final — never re-applied by a (possibly
     * late/duplicate) webhook once it reaches one of these states.
     */
    public function isTerminal(): bool
    {
        return in_array($this->status, [self::STATUS_PAID, self::STATUS_FAILED, self::STATUS_SUPERSEDED], true);
    }
}
