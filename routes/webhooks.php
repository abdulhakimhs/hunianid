<?php

use App\Http\Controllers\Webhooks\WablasWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('webhooks/wablas/incoming', [WablasWebhookController::class, 'incoming'])
    ->name('webhooks.wablas.incoming');
