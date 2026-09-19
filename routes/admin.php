<?php

use App\Http\Controllers\Admin\AreaHandoverController;
use App\Http\Controllers\Admin\FamiliesController;
use App\Http\Controllers\Admin\InviteController;
use App\Http\Controllers\Admin\MemberApprovalController;
use App\Http\Controllers\Admin\MembersController;
use App\Http\Controllers\Admin\SecurityController;
use App\Http\Controllers\Admin\UnitsController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\FamilyController;
use App\Http\Controllers\Security\DashboardController as SecurityDashboardController;
use App\Http\Controllers\Security\HistoryController as SecurityHistoryController;
use App\Http\Controllers\Security\ProfileController as SecurityProfileController;
use App\Http\Controllers\Security\ScanController as SecurityScanController;
use App\Http\Controllers\UnitJoinController;
use Illuminate\Support\Facades\Route;

// Public invite routes — no invite, no way in.
Route::get('invite/{code}', [InviteController::class, 'show'])->name('invite.show');
Route::post('invite/{code}/submit', [InviteController::class, 'submit'])->name('invite.submit');

// Public Security claim-password routes — the WhatsApp invite link points here.
Route::get('security/claim/{code}', [SecurityController::class, 'show'])->name('security.claim.show');
Route::post('security/claim/{code}', [SecurityController::class, 'submit'])->name('security.claim.submit');

Route::middleware(['auth'])->group(function () {
    Route::get('unit/join-requests', [UnitJoinController::class, 'index'])->name('unit.join-requests.index');
    Route::post('unit/{unit}/join-requests/{joinRequest}/confirm', [UnitJoinController::class, 'confirm'])->name('unit.join-requests.confirm');
    Route::post('unit/{unit}/join-requests/{joinRequest}/decline', [UnitJoinController::class, 'decline'])->name('unit.join-requests.decline');

    // Resident self-service — any active resident of a unit manages that unit's family
    // members directly, no admin approval. Admin's own /admin/families stays read-only.
    Route::resource('family', FamilyController::class)->only(['index', 'store', 'update', 'destroy']);

    Route::middleware(['admin.role:superadmin,staff'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('members/pending', [MemberApprovalController::class, 'index'])->name('members.pending');
        Route::post('members/{member}/approve', [MemberApprovalController::class, 'approve'])->name('members.approve');
        Route::post('members/{member}/reject', [MemberApprovalController::class, 'reject'])->name('members.reject');

        Route::get('settings', [SettingsController::class, 'index'])->name('settings.index');
        Route::put('settings', [SettingsController::class, 'update'])->name('settings.update');
        Route::put('settings/security-message', [SettingsController::class, 'updateSecurityMessage'])->name('settings.security-message.update');
    });

    // Invites work for any resident of an area with no superadmin/staff yet, not just
    // whoever founded it — closes once the area actually has an admin.
    Route::middleware(['admin.role:superadmin,staff,area_without_admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('invites', [InviteController::class, 'index'])->name('invites.index');
        Route::post('invites', [InviteController::class, 'store'])->name('invites.store');
        Route::post('invites/tenant', [InviteController::class, 'storeTenant'])->name('invites.tenant.store');
        Route::post('invites/{invite}/revoke', [InviteController::class, 'revoke'])->name('invites.revoke');
        Route::post('invites/{invite}/resend', [InviteController::class, 'resend'])->name('invites.resend');
    });

    // Members list and promoting stay founder-only — a deliberate one-shot handover.
    Route::middleware(['admin.role:superadmin,staff,unclaimed_creator'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('members', [MembersController::class, 'index'])->name('members.index');
        //Route::get('units', [UnitsController::class, 'index'])->name('units.index');
        Route::resource('units', UnitsController::class)->only(['index', 'store', 'update', 'destroy']);
        // Read-only for admins — adding/editing/removing family members is the
        // resident's own call (see the top-level `family` routes above).
        Route::resource('families', FamiliesController::class)->only(['index']);
        Route::resource('security', SecurityController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::get('security/invites', [SecurityController::class, 'invitesIndex'])->name('security.invites');
        Route::post('security/invite-bulk', [SecurityController::class, 'bulkInvite'])->name('security.invite-bulk');
        Route::post('security/{security}/invite', [SecurityController::class, 'invite'])->name('security.invite');
        Route::post('area/promote', [AreaHandoverController::class, 'store'])->name('area.promote');
    });
});
Route::middleware(['auth', 'admin.role:security'])->prefix('security')->name('security.')->group(function () {
    Route::get('/', [SecurityDashboardController::class, 'index'])->name('dashboard');
    Route::get('/scan', [SecurityScanController::class, 'index'])->name('scan');
    Route::post('/scan/verify', [SecurityScanController::class, 'verify'])->name('scan.verify');
    Route::post('/scan/confirm', [SecurityScanController::class, 'confirm'])->name('scan.confirm');
    Route::get('/history', [SecurityHistoryController::class, 'index'])->name('history');
    Route::get('/profile', [SecurityProfileController::class, 'edit'])->name('profile');
    Route::patch('/profile', [SecurityProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [SecurityProfileController::class, 'updatePassword'])->name('profile.password.update');
});
