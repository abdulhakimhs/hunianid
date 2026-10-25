<?php

use App\Http\Controllers\Admin\AnnouncementsController;
use App\Http\Controllers\Admin\AreaHandoverController;
use App\Http\Controllers\Admin\BillingController;
use App\Http\Controllers\Admin\FamiliesController;
use App\Http\Controllers\Admin\InviteController;
use App\Http\Controllers\Admin\InvoiceCategoriesController;
use App\Http\Controllers\Admin\InvoicesController;
use App\Http\Controllers\Admin\InvoiceTemplatesController;
use App\Http\Controllers\Admin\MemberApprovalController;
use App\Http\Controllers\Admin\MembersController;
use App\Http\Controllers\Admin\SecurityController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\StaffController;
use App\Http\Controllers\Admin\TicketsController as AdminTicketsController;
use App\Http\Controllers\Admin\UnitsController;
use App\Http\Controllers\Admin\VisitorPassesController;
use App\Http\Controllers\AnnouncementsController as TenantAnnouncementsController;
use App\Http\Controllers\BillsController;
use App\Http\Controllers\FamilyController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\Security\DashboardController as SecurityDashboardController;
use App\Http\Controllers\Security\HistoryController as SecurityHistoryController;
use App\Http\Controllers\Security\ProfileController as SecurityProfileController;
use App\Http\Controllers\Security\ScanController as SecurityScanController;
use App\Http\Controllers\TenantDashboardController;
use App\Http\Controllers\TenantPanicController;
use App\Http\Controllers\TenantProfileController;
use App\Http\Controllers\TicketsController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UnitJoinController;
use Illuminate\Support\Facades\Route;

// Public invite routes — no invite, no way in.
Route::get('invite/{code}', [InviteController::class, 'show'])->name('invite.show');
Route::post('invite/{code}/submit', [InviteController::class, 'submit'])->name('invite.submit');

// Public Security claim-password routes — the WhatsApp invite link points here.
Route::get('security/claim/{code}', [SecurityController::class, 'show'])->name('security.claim.show');
Route::post('security/claim/{code}', [SecurityController::class, 'submit'])->name('security.claim.submit');

// Public Staff claim-password routes — the WhatsApp invite link points here.
Route::get('staff/claim/{code}', [StaffController::class, 'show'])->name('staff.claim.show');
Route::post('staff/claim/{code}', [StaffController::class, 'submit'])->name('staff.claim.submit');

Route::middleware(['auth'])->group(function () {
    Route::get('unit/join-requests', [UnitJoinController::class, 'index'])->name('unit.join-requests.index');
    Route::post('unit/{unit}/join-requests/{joinRequest}/confirm', [UnitJoinController::class, 'confirm'])->name('unit.join-requests.confirm');
    Route::post('unit/{unit}/join-requests/{joinRequest}/decline', [UnitJoinController::class, 'decline'])->name('unit.join-requests.decline');

    // Role-agnostic — both tenant and security PWAs register/unregister their own
    // device's push subscription through here.
    Route::post('push-subscriptions', [PushSubscriptionController::class, 'store'])->name('push-subscriptions.store');
    Route::delete('push-subscriptions', [PushSubscriptionController::class, 'destroy'])->name('push-subscriptions.destroy');

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
        Route::put('settings/reminder', [SettingsController::class, 'updateReminderSettings'])->name('settings.reminder.update');
        Route::put('settings/ticket-escalation', [SettingsController::class, 'updateTicketEscalationSettings'])->name('settings.ticket-escalation.update');

        // Deliberately outside the subscription.active group below — an expired
        // admin still needs to reach the billing page itself to pay and reactivate.
        Route::get('billing', [BillingController::class, 'index'])->name('billing.index');
        Route::get('billing/expired', [BillingController::class, 'expired'])->name('billing.expired');
        Route::post('billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');

        // Invoicing touches money and payment status, so it stays out of the broader
        // unclaimed_creator/area_without_admin groups below — only a fully-approved
        // superadmin/staff can bill tenants or mark invoices paid.
        Route::middleware(['subscription.active'])->group(function () {
            Route::get('invoices', [InvoicesController::class, 'index'])->name('invoices.index');
            Route::get('invoices/create', [InvoicesController::class, 'create'])->name('invoices.create');
            Route::post('invoices', [InvoicesController::class, 'store'])->name('invoices.store');
            Route::post('invoices/mark-paid-bulk', [InvoicesController::class, 'markPaidBulk'])->name('invoices.mark-paid-bulk');
            Route::post('invoices/cancel-bulk', [InvoicesController::class, 'cancelBulk'])->name('invoices.cancel-bulk');
            Route::post('invoices/{invoice}/mark-paid', [InvoicesController::class, 'markPaid'])->name('invoices.mark-paid');
            Route::get('invoices/{invoice}/payment-proof', [InvoicesController::class, 'paymentProof'])->name('invoices.payment-proof');
            Route::post('invoices/{invoice}/cancel', [InvoicesController::class, 'cancel'])->name('invoices.cancel');

            Route::get('tickets', [AdminTicketsController::class, 'index'])->name('tickets.index');
            Route::get('tickets/{ticket}', [AdminTicketsController::class, 'show'])->name('tickets.show');
            Route::patch('tickets/{ticket}/status', [AdminTicketsController::class, 'updateStatus'])->name('tickets.status');
            Route::post('tickets/{ticket}/update', [AdminTicketsController::class, 'sendUpdate'])->name('tickets.send-update');
            Route::patch('tickets/{ticket}/assign', [AdminTicketsController::class, 'assign'])->name('tickets.assign');
            Route::patch('tickets/{ticket}/priority', [AdminTicketsController::class, 'setPriority'])->name('tickets.priority');
            Route::post('tickets/{ticket}/notes', [AdminTicketsController::class, 'addNote'])->name('tickets.notes');
            Route::get('tickets/{ticket}/messages/{message}/photo', [AdminTicketsController::class, 'photo'])->name('tickets.photo');
        });

        Route::post('invoice-templates', [InvoiceTemplatesController::class, 'store'])->name('invoice-templates.store');
        Route::put('invoice-templates/{template}', [InvoiceTemplatesController::class, 'update'])->name('invoice-templates.update');
        Route::delete('invoice-templates/{template}', [InvoiceTemplatesController::class, 'destroy'])->name('invoice-templates.destroy');

        Route::get('invoice-categories', [InvoiceCategoriesController::class, 'index'])->name('invoice-categories.index');
        Route::post('invoice-categories', [InvoiceCategoriesController::class, 'store'])->name('invoice-categories.store');
        Route::put('invoice-categories/{invoiceCategory}', [InvoiceCategoriesController::class, 'update'])->name('invoice-categories.update');
        Route::delete('invoice-categories/{invoiceCategory}', [InvoiceCategoriesController::class, 'destroy'])->name('invoice-categories.destroy');
    });

    Route::middleware(['admin.role:superadmin', 'subscription.active'])->prefix('admin')->name('admin.')->group(function () {
        Route::resource('staff', StaffController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::get('staff/invites', [StaffController::class, 'invitesIndex'])->name('staff.invites');
        Route::post('staff/invite-bulk', [StaffController::class, 'bulkInvite'])->name('staff.invite-bulk');
        Route::post('staff/{staff}/invite', [StaffController::class, 'invite'])->name('staff.invite');
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
        // Route::get('units', [UnitsController::class, 'index'])->name('units.index');
        Route::resource('units', UnitsController::class)->only(['index', 'store', 'update', 'destroy']);
        // Read-only for admins — adding/editing/removing family members is the
        // resident's own call (see the top-level `family` routes above).
        Route::resource('families', FamiliesController::class)->only(['index']);
        Route::post('area/promote', [AreaHandoverController::class, 'store'])->name('area.promote');

        Route::middleware(['subscription.active'])->group(function () {
            Route::resource('security', SecurityController::class)->only(['index', 'store', 'update', 'destroy']);
            Route::get('security/invites', [SecurityController::class, 'invitesIndex'])->name('security.invites');
            Route::post('security/invite-bulk', [SecurityController::class, 'bulkInvite'])->name('security.invite-bulk');
            Route::post('security/{security}/invite', [SecurityController::class, 'invite'])->name('security.invite');

            Route::resource('announcements', AnnouncementsController::class)->only(['index', 'store', 'update', 'destroy']);

            Route::get('visitor-passes', [VisitorPassesController::class, 'index'])->name('visitor-passes.index');
        });
    });
});
Route::middleware(['auth', 'admin.role:security'])->prefix('security')->name('security.')->group(function () {
    Route::get('/', [SecurityDashboardController::class, 'index'])->name('dashboard');
    Route::get('/scan', [SecurityScanController::class, 'index'])->name('scan');
    Route::post('/scan/verify', [SecurityScanController::class, 'verify'])->name('scan.verify');
    Route::post('/scan/confirm', [SecurityScanController::class, 'confirm'])->name('scan.confirm');
    Route::post('/scan/exit', [SecurityScanController::class, 'exit'])->name('scan.exit');
    Route::get('/history', [SecurityHistoryController::class, 'index'])->name('history');
    Route::get('/profile', [SecurityProfileController::class, 'edit'])->name('profile');
    Route::patch('/profile', [SecurityProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [SecurityProfileController::class, 'updatePassword'])->name('profile.password.update');
});
Route::prefix('tenant')->name('tenant.')->middleware(['auth', 'pending.approval'])->group(function () {
    Route::get('/', [TenantDashboardController::class, 'index'])->name('dashboard');
    Route::inertia('/visitor-pass', 'tenant/visitor-pass')->name('visitorpass');
    Route::get('/bills', [BillsController::class, 'index'])->name('bills');
    Route::get('/bills/{invoice}/payment-proof', [BillsController::class, 'paymentProof'])->name('bills.payment-proof');
    Route::get('/unit', [UnitController::class, 'show'])->name('unit');
    Route::get('/family', [FamilyController::class, 'tenantIndex'])->name('family');
    Route::get('/profile', [TenantProfileController::class, 'edit'])->name('profile');
    Route::get('/notifications', [TenantAnnouncementsController::class, 'index'])->name('notifications');
    Route::inertia('/panic', 'tenant/panic')->name('panic');
    Route::post('/panic/trigger', [TenantPanicController::class, 'trigger'])->name('panic.trigger');
    Route::get('/tickets', [TicketsController::class, 'index'])->name('tickets');
    Route::post('/tickets', [TicketsController::class, 'store'])->name('tickets.store');
    Route::get('/tickets/{ticket}', [TicketsController::class, 'show'])->name('tickets.show');
    Route::patch('/tickets/{ticket}/close', [TicketsController::class, 'close'])->name('tickets.close');
    Route::get('/tickets/{ticket}/messages/{message}/photo', [TicketsController::class, 'photo'])->name('tickets.photo');
});
