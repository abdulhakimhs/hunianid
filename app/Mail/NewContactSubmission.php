<?php

namespace App\Mail;

use App\Models\ContactSubmission;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewContactSubmission extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ContactSubmission $submission,
    ) {}

    public function build(): self
    {
        return $this
            ->subject("Lead baru dari landing page: {$this->submission->name}")
            ->view('emails.new-contact-submission');
    }
}
