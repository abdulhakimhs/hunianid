<?php

namespace Tests\Feature;

use App\Models\Ticket;
use App\Models\TicketChatConversation;
use App\Models\Unit;
use App\Models\User;
use App\Services\DeepSeekService;
use App\Services\TicketChatService;
use App\Services\WaBlastService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\TestCase;

class TicketChatServiceTest extends TestCase
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

        app(TicketChatService::class)->handleIncomingMessage('081234567890', 'lapor lampu koridor mati');

        $this->assertSame(0, TicketChatConversation::count());
        $this->assertSame(0, Ticket::count());
    }

    public function test_resident_with_single_unit_skips_straight_to_deepseek(): void
    {
        $user = User::factory()->create(['phone' => '6281234567891']);
        $unit = Unit::factory()->create();
        $user->units()->attach($unit->id, ['relation' => 'owner', 'status' => 'active']);

        $this->mock(DeepSeekService::class, function (MockInterface $mock) {
            $mock->shouldReceive('converse')
                ->once()
                ->andReturn(['action' => 'ask', 'message' => 'Boleh ceritakan lebih detail?']);
        });

        $this->mock(WaBlastService::class, function (MockInterface $mock) {
            $mock->shouldReceive('send')
                ->once()
                ->with('6281234567891', 'Boleh ceritakan lebih detail?')
                ->andReturn(['ok' => true, 'error' => null]);
        });

        app(TicketChatService::class)->handleIncomingMessage('081234567891', 'lapor ada yang rusak');

        $conversation = TicketChatConversation::where('phone', '6281234567891')->firstOrFail();
        $this->assertSame($unit->id, $conversation->collected_fields['unit_id']);
    }

    public function test_resident_with_multiple_active_units_is_asked_to_choose(): void
    {
        $user = User::factory()->create(['phone' => '6281234567892']);
        $unitA = Unit::factory()->create();
        $unitB = Unit::factory()->create();
        $user->units()->attach($unitA->id, ['relation' => 'owner', 'status' => 'active']);
        $user->units()->attach($unitB->id, ['relation' => 'owner', 'status' => 'active']);

        $this->mock(WaBlastService::class, function (MockInterface $mock) {
            $mock->shouldReceive('send')
                ->once()
                ->with('6281234567892', \Mockery::pattern('/rumah yang mana/'))
                ->andReturn(['ok' => true, 'error' => null]);
        });

        $this->mock(DeepSeekService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('converse');
        });

        app(TicketChatService::class)->handleIncomingMessage('081234567892', 'lapor kolam kotor');

        $conversation = TicketChatConversation::where('phone', '6281234567892')->firstOrFail();
        $this->assertSame('awaiting_unit_choice', $conversation->status);
        $this->assertCount(2, $conversation->collected_fields['unit_options']);
    }

    public function test_completed_conversation_creates_ticket_and_notifies(): void
    {
        $user = User::factory()->create(['phone' => '6281234567893']);
        $unit = Unit::factory()->create();
        $user->units()->attach($unit->id, ['relation' => 'owner', 'status' => 'active']);

        $this->mock(DeepSeekService::class, function (MockInterface $mock) {
            $mock->shouldReceive('converse')
                ->once()
                ->andReturn([
                    'action' => 'complete',
                    'category' => 'Kebersihan',
                    'description' => 'Kolam renang di taman kotor banget sudah seminggu.',
                ]);
        });

        $this->mock(WaBlastService::class, function (MockInterface $mock) {
            $mock->shouldReceive('send')
                ->once()
                ->with('6281234567893', \Mockery::pattern('/Laporan Anda sudah diterima/'))
                ->andReturn(['ok' => true, 'error' => null]);
        });

        app(TicketChatService::class)->handleIncomingMessage('081234567893', 'lapor kolam di taman kotor banget sudah seminggu');

        $ticket = Ticket::firstOrFail();
        $this->assertSame('cleanliness', $ticket->category);
        $this->assertSame('whatsapp_ai', $ticket->source);
        $this->assertSame($unit->id, $ticket->unit_id);
        $this->assertSame($unit->area_id, $ticket->area_id);
        $this->assertSame('Kolam renang di taman kotor banget sudah seminggu.', $ticket->messages->first()->body);

        $conversation = TicketChatConversation::where('phone', '6281234567893')->firstOrFail();
        $this->assertSame('completed', $conversation->status);
        $this->assertSame($ticket->id, $conversation->ticket_id);
    }

    public function test_reset_phrase_restarts_the_conversation(): void
    {
        $user = User::factory()->create(['phone' => '6281234567894']);
        $unit = Unit::factory()->create();
        $user->units()->attach($unit->id, ['relation' => 'owner', 'status' => 'active']);

        TicketChatConversation::create([
            'phone' => '6281234567894',
            'user_id' => $user->id,
            'status' => 'collecting',
            'collected_fields' => ['unit_id' => $unit->id, 'area_id' => $unit->area_id],
            'history' => [['role' => 'user', 'content' => 'lapor sesuatu']],
            'last_message_at' => now(),
        ]);

        $this->mock(WaBlastService::class, function (MockInterface $mock) {
            $mock->shouldReceive('send')
                ->once()
                ->with('6281234567894', \Mockery::pattern('/mulai dari awal/'))
                ->andReturn(['ok' => true, 'error' => null]);
        });

        $this->mock(DeepSeekService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('converse');
        });

        app(TicketChatService::class)->handleIncomingMessage('081234567894', 'batal');

        $conversation = TicketChatConversation::where('phone', '6281234567894')->firstOrFail();
        $this->assertSame('collecting', $conversation->status);
        $this->assertNull($conversation->collected_fields);
    }
}
