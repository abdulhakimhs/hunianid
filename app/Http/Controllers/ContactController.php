<?php

namespace App\Http\Controllers;

use App\Services\ContactSubmissionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function submit(Request $request, ContactSubmissionService $service): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company_or_area_name' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:2000'],
            'plan_interest' => ['nullable', 'string', 'max:50'],
        ]);

        $service->submit($data);

        return back()->with('success', 'Terima kasih! Tim kami akan segera menghubungi Anda.');
    }
}
