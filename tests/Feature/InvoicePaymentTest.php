<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\Invoice;
use App\Models\InvoiceCategory;
use App\Models\Role;
use App\Models\Unit;
use App\Models\UnitUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InvoicePaymentTest extends TestCase
{
    use RefreshDatabase;

    private function member(Area $area, string $role, string $status = 'active'): User
    {
        $user = User::factory()->create();

        // AreaMember::create, not the factory — its definition calls Role::factory(), which doesn't exist.
        AreaMember::create([
            'area_id' => $area->id,
            'user_id' => $user->id,
            'role_id' => Role::firstOrCreate(['key_name' => $role], ['label' => ucfirst($role)])->id,
            'status' => $status,
        ]);

        return $user;
    }

    private function resident(Area $area, string $status = 'active'): array
    {
        $user = $this->member($area, 'resident', $status);
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);

        UnitUser::factory()->create(['unit_id' => $unit->id, 'user_id' => $user->id, 'relation' => 'owner']);

        return [$user, $unit];
    }

    private function invoice(Area $area, User $tenant, Unit $unit, array $attrs = []): Invoice
    {
        $category = InvoiceCategory::firstOrCreate(['area_id' => $area->id, 'name' => 'IPL'], ['is_active' => true]);

        return Invoice::create(array_merge([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'invoice_number' => 'INV/2026/10/'.fake()->unique()->numerify('####'),
            'invoice_date' => now(),
            'amount' => 100000,
            'status' => 'unpaid',
            'invoice_category_id' => $category->id,
        ], $attrs));
    }

    /**
     * A real file, not UploadedFile::fake() — fakes report their MIME type from the
     * filename, so they can't prove the content-based `mimetypes` check works.
     */
    private function disguisedPhpFile(): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'proof');
        file_put_contents($path, '<?php echo "x";');

        return new UploadedFile($path, 'bukti.png', 'image/png', null, true);
    }

    public function test_pending_approval_resident_is_not_billable(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        [$active] = $this->resident($area);
        [$pending] = $this->resident($area, 'pending_approval');

        $this->actingAs($admin)
            ->get('/admin/invoices/create')
            ->assertInertia(fn (Assert $page) => $page
                ->has('units', 1)
                ->where('units.0.tenants.0.id', $active->id));
    }

    public function test_security_without_unit_is_hidden_from_members_list(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        $hiredGuard = $this->member($area, 'security');
        $livingGuard = $this->member($area, 'security');
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        UnitUser::factory()->create(['unit_id' => $unit->id, 'user_id' => $livingGuard->id, 'relation' => 'owner']);

        $this->actingAs($admin)
            ->get('/admin/members')
            ->assertInertia(function (Assert $page) use ($hiredGuard, $livingGuard) {
                $ids = collect($page->toArray()['props']['members'])->pluck('user_id');
                $this->assertNotContains($hiredGuard->id, $ids);
                $this->assertContains($livingGuard->id, $ids);
            });
    }

    public function test_mark_paid_requires_proof_and_stores_it_privately(): void
    {
        Storage::fake('local');
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        [$tenant, $unit] = $this->resident($area);
        $invoice = $this->invoice($area, $tenant, $unit);

        $this->actingAs($admin)
            ->post("/admin/invoices/{$invoice->id}/mark-paid", ['paid_at' => now()->toDateString()])
            ->assertSessionHasErrors('payment_proof');

        $this->actingAs($admin)
            ->post("/admin/invoices/{$invoice->id}/mark-paid", [
                'paid_at' => '2026-10-01',
                'payment_proof' => UploadedFile::fake()->image('bukti.png'),
            ])
            ->assertSessionHasNoErrors();

        $invoice->refresh();
        $this->assertSame('paid', $invoice->status);
        $this->assertSame('2026-10-01', $invoice->paid_at->toDateString());
        $this->assertStringStartsWith("payment-proofs/{$area->id}/", $invoice->payment_proof_path);
        Storage::disk('local')->assertExists($invoice->payment_proof_path);
    }

    public function test_mark_paid_rejects_non_image_files(): void
    {
        Storage::fake('local');
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        [$tenant, $unit] = $this->resident($area);
        $invoice = $this->invoice($area, $tenant, $unit);

        foreach ([
            UploadedFile::fake()->create('bukti.pdf', 100, 'application/pdf'),
            UploadedFile::fake()->image('bukti.gif'),
            $this->disguisedPhpFile(),
        ] as $file) {
            $this->actingAs($admin)
                ->post("/admin/invoices/{$invoice->id}/mark-paid", ['paid_at' => now()->toDateString(), 'payment_proof' => $file])
                ->assertSessionHasErrors('payment_proof');
        }

        $this->assertSame('unpaid', $invoice->refresh()->status);
        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_bulk_mark_paid_needs_only_date(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        [$tenant, $unit] = $this->resident($area);
        $a = $this->invoice($area, $tenant, $unit);
        $b = $this->invoice($area, $tenant, $unit, ['invoice_category_id' => $a->invoice_category_id]);

        $this->actingAs($admin)
            ->post('/admin/invoices/mark-paid-bulk', ['invoice_ids' => [$a->id, $b->id], 'paid_at' => '2026-10-02'])
            ->assertSessionHasNoErrors();

        $this->assertSame('2026-10-02', $a->refresh()->paid_at->toDateString());
        $this->assertSame('paid', $b->refresh()->status);
    }

    public function test_payment_proof_is_only_visible_to_area_admin_and_billed_tenant(): void
    {
        Storage::fake('local');
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        [$tenant, $unit] = $this->resident($area);
        [$otherTenant] = $this->resident($area);
        $otherArea = Area::factory()->create();
        $otherAdmin = $this->member($otherArea, 'superadmin');

        $path = UploadedFile::fake()->image('bukti.png')->store("payment-proofs/{$area->id}", 'local');
        $invoice = $this->invoice($area, $tenant, $unit, ['status' => 'paid', 'paid_at' => now(), 'payment_proof_path' => $path]);

        $this->actingAs($admin)->get("/admin/invoices/{$invoice->id}/payment-proof")->assertOk();
        $this->actingAs($tenant)->get("/tenant/bills/{$invoice->id}/payment-proof")->assertOk();
        $this->actingAs($otherTenant)->get("/tenant/bills/{$invoice->id}/payment-proof")->assertNotFound();
        $this->actingAs($otherAdmin)->get("/admin/invoices/{$invoice->id}/payment-proof")->assertNotFound();
    }
}
