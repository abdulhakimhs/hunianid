<?php

namespace App\Services;

use App\Mail\NewContactSubmission;
use App\Models\ContactSubmission;
use App\Models\NotificationRecipient;
use Illuminate\Support\Facades\Mail;

class ContactSubmissionService
{
    public function submit(array $data): ContactSubmission
    {
        $submission = ContactSubmission::create($data);

        // No queue worker runs in this project (see bootstrap/app.php's scheduled
        // commands), so this sends synchronously like every other notification path.
        foreach (NotificationRecipient::where('is_active', true)->get() as $recipient) {
            Mail::to($recipient->email)->send(new NewContactSubmission($submission));
        }

        return $submission;
    }
}
