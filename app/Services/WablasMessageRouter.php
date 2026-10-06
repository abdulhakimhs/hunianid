<?php

namespace App\Services;

use App\Models\FamilyChatConversation;
use App\Models\WhatsappConversation;
use App\Support\PhoneNumber;

/**
 * Decides which WhatsApp AI chat flow an incoming message belongs to, so a single
 * Wablas number can serve both the visitor-pass flow and the family-management flow
 * without their conversation state colliding. Precedence: continue whichever flow is
 * already mid-conversation for this phone; otherwise, a "keluarga" keyword starts the
 * family flow, and everything else falls back to visitor-pass (unchanged behavior).
 */
class WablasMessageRouter
{
    private const FAMILY_KEYWORDS = ['keluarga'];

    public function __construct(
        private readonly FamilyChatService $familyChat,
        private readonly VisitorPassChatService $visitorPassChat,
    ) {}

    public function route(string $rawPhone, string $text): void
    {
        $phone = PhoneNumber::normalize($rawPhone);

        if ($this->hasActiveConversation(FamilyChatConversation::where('phone', $phone)->first())) {
            $this->familyChat->handleIncomingMessage($rawPhone, $text);

            return;
        }

        if ($this->hasActiveConversation(WhatsappConversation::where('phone', $phone)->first())) {
            $this->visitorPassChat->handleIncomingMessage($rawPhone, $text);

            return;
        }

        if ($this->mentionsFamily($text)) {
            $this->familyChat->handleIncomingMessage($rawPhone, $text);

            return;
        }

        $this->visitorPassChat->handleIncomingMessage($rawPhone, $text);
    }

    private function hasActiveConversation(FamilyChatConversation|WhatsappConversation|null $conversation): bool
    {
        if (! $conversation) {
            return false;
        }

        if ($conversation->status === 'completed' || $conversation->status === 'abandoned') {
            return false;
        }

        return ! $conversation->isStale();
    }

    private function mentionsFamily(string $text): bool
    {
        $lower = mb_strtolower($text);

        foreach (self::FAMILY_KEYWORDS as $keyword) {
            if (str_contains($lower, $keyword)) {
                return true;
            }
        }

        return false;
    }
}
