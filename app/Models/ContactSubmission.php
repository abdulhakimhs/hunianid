<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'email', 'phone', 'company_or_area_name', 'message', 'plan_interest', 'status'])]
class ContactSubmission extends Model
{
}
