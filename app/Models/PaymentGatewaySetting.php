<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['provider', 'mode', 'server_key_sandbox', 'client_key_sandbox', 'server_key_production', 'client_key_production', 'is_active'])]
class PaymentGatewaySetting extends Model
{
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * The single active gateway config row, edited directly in phpMyAdmin.
     */
    public static function current(): ?self
    {
        return static::where('is_active', true)->first();
    }

    public function serverKey(): ?string
    {
        return $this->mode === 'production' ? $this->server_key_production : $this->server_key_sandbox;
    }

    public function clientKey(): ?string
    {
        return $this->mode === 'production' ? $this->client_key_production : $this->client_key_sandbox;
    }

    public function baseUrl(): string
    {
        return $this->mode === 'production'
            ? 'https://app.midtrans.com'
            : 'https://app.sandbox.midtrans.com';
    }
}
