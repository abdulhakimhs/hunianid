<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Complex;
use App\Models\Unit;
use App\Models\User;
use App\Models\VisitorPass;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VisitorPassPublicPageTest extends TestCase
{
    use RefreshDatabase;

    private function makePass(array $attributes = []): VisitorPass
    {
        $complex = Complex::factory()->create();
        $area = Area::factory()->create(['complex_id' => $complex->id]);
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $complex->id]);
        $user = User::factory()->create();

        return VisitorPass::create(array_merge([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'guest_name' => 'Budi',
            'vehicle_info' => 'Motor merah',
            'purpose' => 'Mengantar makanan',
            'status' => 'pending',
            'valid_from' => now(),
            'valid_until' => now()->endOfDay(),
            'source' => 'whatsapp_ai',
        ], $attributes));
    }

    public function test_unknown_token_shows_not_found(): void
    {
        $this->get('/pass/does-not-exist')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('visitor-pass/show')->where('found', false));
    }

    public function test_valid_pass_shows_qr(): void
    {
        $pass = $this->makePass();

        $this->get("/pass/{$pass->token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('visitor-pass/show')
                ->where('found', true)
                ->where('state', 'valid')
                ->where('guestName', 'Budi')
                ->has('qrSvg'));
    }

    public function test_used_pass_still_shows_its_qr_so_the_guest_can_scan_out(): void
    {
        // A guest still inside (used, not yet exited) must keep a scannable
        // QR — otherwise there's nothing left to show the guard on the way
        // out. This is the regression guard for the IN-only bug.
        $pass = $this->makePass(['status' => 'used', 'used_at' => now()]);

        $this->get("/pass/{$pass->token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('visitor-pass/show')
                ->where('state', 'used')
                ->has('qrSvg'));
    }

    public function test_exited_pass_shows_exited_state_without_qr(): void
    {
        $pass = $this->makePass(['status' => 'exited', 'used_at' => now()->subHour(), 'exited_at' => now()]);

        $this->get("/pass/{$pass->token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('visitor-pass/show')
                ->where('state', 'exited')
                ->where('qrSvg', null));
    }

    public function test_expired_pass_shows_expired_state(): void
    {
        $pass = $this->makePass([
            'valid_from' => now()->subDays(2),
            'valid_until' => now()->subDay(),
        ]);

        $this->get("/pass/{$pass->token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('visitor-pass/show')->where('state', 'expired'));
    }

    public function test_cancelled_pass_shows_cancelled_state(): void
    {
        $pass = $this->makePass(['status' => 'cancelled']);

        $this->get("/pass/{$pass->token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('visitor-pass/show')->where('state', 'cancelled'));
    }
}
