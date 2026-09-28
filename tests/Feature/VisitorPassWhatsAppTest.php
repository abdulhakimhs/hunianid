<?php

namespace Tests\Feature;

use App\Models\Unit;
use App\Models\User;
use App\Models\VisitorPass;
use App\Models\WhatsappConversation;
use App\Services\DeepSeekService;
use App\Services\VisitorPassChatService;
use App\Services\WaBlastService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\TestCase;

class VisitorPassWhatsAppTest extends TestCase
{
    use RefreshDatabase;

    public function test_unregistered_phone_gets_polite_decline(): void
    {
        $this->mock(WaBlastService::class, function (MockInterface $mock) {
            $mock->shouldReceive('send')
                ->once()
                ->with('6281234567890', \Mockery::pattern('/belum terdaftar/'))
                ->andReturn(['ok' => true, 'error' => null]);
        });

        $this->mock(DeepSeekService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('converse');
        });

        app(VisitorPassChatService::class)->handleIncomingMessage('081234567890', 'gofood akan datang');

        $this->assertSame(0, WhatsappConversation::count());
        $this->assertSame(0, VisitorPass::count());
    }

    public function test_resident_with_multiple_active_units_is_asked_to_choose(): void
    {
        $user = User::factory()->create(['phone' => '6281234567891']);
        $unitA = Unit::factory()->create();
        $unitB = Unit::factory()->create();
        $user->units()->attach($unitA->id, ['relation' => 'owner', 'status' => 'active']);
        $user->units()->attach($unitB->id, ['relation' => 'owner', 'status' => 'active']);

        $this->mock(WaBlastService::class, function (MockInterface $mock) {
            $mock->shouldReceive('send')
                ->once()
                ->with('6281234567891', \Mockery::pattern('/rumah yang mana/'))
                ->andReturn(['ok' => true, 'error' => null]);
        });

        $this->mock(DeepSeekService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('converse');
        });

        app(VisitorPassChatService::class)->handleIncomingMessage('081234567891', 'gofood akan datang');

        $conversation = WhatsappConversation::where('phone', '6281234567891')->firstOrFail();
        $this->assertSame('awaiting_unit_choice', $conversation->status);
        $this->assertCount(2, $conversation->collected_fields['unit_options']);
    }

    public function test_completed_conversation_creates_visitor_pass_and_sends_link(): void
    {
        $user = User::factory()->create(['phone' => '6281234567892']);
        $unit = Unit::factory()->create();
        $user->units()->attach($unit->id, ['relation' => 'owner', 'status' => 'active']);

        $this->mock(DeepSeekService::class, function (MockInterface $mock) {
            $mock->shouldReceive('converse')
                ->once()
                ->andReturn([
                    'action' => 'complete',
                    'guest_name' => 'Budi',
                    'vehicle_info' => 'Motor merah',
                    'purpose' => 'Mengantar makanan',
                ]);
        });

        $this->mock(WaBlastService::class, function (MockInterface $mock) {
            $mock->shouldReceive('send')
                ->once()
                ->with('6281234567892', \Mockery::pattern('/Visitor pass berhasil dibuat.*\/pass\//s'))
                ->andReturn(['ok' => true, 'error' => null]);
        });

        app(VisitorPassChatService::class)->handleIncomingMessage('081234567892', 'gofood akan datang, motor merah, antar makanan');

        $pass = VisitorPass::firstOrFail();
        $this->assertSame('Budi', $pass->guest_name);
        $this->assertSame('whatsapp_ai', $pass->source);
        $this->assertSame($unit->id, $pass->unit_id);
        $this->assertSame($unit->area_id, $pass->area_id);

        $conversation = WhatsappConversation::where('phone', '6281234567892')->firstOrFail();
        $this->assertSame('completed', $conversation->status);
        $this->assertSame($pass->id, $conversation->visitor_pass_id);
    }

    public function test_incomplete_ai_response_is_treated_as_a_reask(): void
    {
        $user = User::factory()->create(['phone' => '6281234567893']);
        $unit = Unit::factory()->create();
        $user->units()->attach($unit->id, ['relation' => 'owner', 'status' => 'active']);

        $this->mock(DeepSeekService::class, function (MockInterface $mock) {
            $mock->shouldReceive('converse')
                ->once()
                ->andReturn([
                    'action' => 'complete',
                    'guest_name' => 'Budi',
                    'vehicle_info' => '',
                    'purpose' => '',
                ]);
        });

        $this->mock(WaBlastService::class, function (MockInterface $mock) {
            $mock->shouldReceive('send')
                ->once()
                ->with('6281234567893', \Mockery::pattern('/kendaraannya/'))
                ->andReturn(['ok' => true, 'error' => null]);
        });

        app(VisitorPassChatService::class)->handleIncomingMessage('081234567893', 'gofood akan datang');

        $this->assertSame(0, VisitorPass::count());
    }
}
