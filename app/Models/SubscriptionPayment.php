<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['subscription_id', 'order_id', 'gross_amount', 'billing_cycle', 'midtrans_transaction_id', 'midtrans_transaction_status', 'payment_type', 'snap_token', 'paid_at', 'raw_notification'])]
class SubscriptionPayment extends Model
{
    protected function casts(): array
    {
        return [
            'paid_at' => 'datetime',
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
}
