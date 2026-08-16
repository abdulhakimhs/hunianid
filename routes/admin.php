<?php

use App\Http\Controllers\Admin\AreaHandoverController;
use App\Http\Controllers\Admin\InviteController;
use App\Http\Controllers\Admin\MemberApprovalController;
use App\Http\Controllers\Admin\MembersController;
use App\Http\Controllers\UnitJoinController;
use Illuminate\Support\Facades\Route;

// Public invite routes — no invite, no way in.
Route::get('invite/{code}', [InviteController::class, 'show'])->name('invite.show');
Route::post('invite/{code}/submit', [InviteController::class, 'submit'])->name('invite.submit');

Route::middleware(['auth'])->group(function () {
    Route::get('unit/join-requests', [UnitJoinController::class, 'index'])->name('unit.join-requests.index');
    Route::post('unit/{unit}/join-requests/{joinRequest}/confirm', [UnitJoinController::class, 'confirm'])->name('unit.join-requests.confirm');
    Route::post('unit/{unit}/join-requests/{joinRequest}/decline', [UnitJoinController::class, 'decline'])->name('unit.join-requests.decline');

    Route::middleware(['admin.role:superadmin,staff'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('members/pending', [MemberApprovalController::class, 'index'])->name('members.pending');
        Route::post('members/{member}/approve', [MemberApprovalController::class, 'approve'])->name('members.approve');
        Route::post('members/{member}/reject', [MemberApprovalController::class, 'reject'])->name('members.reject');
    });

    // Invites work for any resident of an area with no superadmin/staff yet, not just
    // whoever founded it — closes once the area actually has an admin.
    Route::middleware(['admin.role:superadmin,staff,area_without_admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('invites', [InviteController::class, 'index'])->name('invites.index');
        Route::post('invites', [InviteController::class, 'store'])->name('invites.store');
        Route::post('invites/{invite}/revoke', [InviteController::class, 'revoke'])->name('invites.revoke');
    });

    // Members list and promoting stay founder-only — a deliberate one-shot handover.
    Route::middleware(['admin.role:superadmin,staff,unclaimed_creator'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('members', [MembersController::class, 'index'])->name('members.index');
        Route::post('area/promote', [AreaHandoverController::class, 'store'])->name('area.promote');
    });
});
