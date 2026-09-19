<?php

namespace App\Http\Requests\Security;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSecurityProfileRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
        ];
    }
}
