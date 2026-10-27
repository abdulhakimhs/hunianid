<?php

use App\Http\Controllers\Webhooks\MidtransWebhookController;
use App\Http\Controllers\Webhooks\WablasWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('webhooks/wablas/incoming', [WablasWebhookController::class, 'incoming'])
    ->name('webhooks.wablas.incoming');

// Midtrans signs the payload itself (see MidtransService::handleNotification),
// so unlike Wablas this needs no shared-secret query param.
Route::post('webhooks/midtrans/notification', [MidtransWebhookController::class, 'handle'])
    ->name('webhooks.midtrans.notification');
