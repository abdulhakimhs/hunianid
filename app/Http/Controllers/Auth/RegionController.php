<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RegionController extends Controller
{
    /**
     * Provinces, from the `indonesia_provinces` table (see docs/hunianid_indonesia.sql).
     */
    public function provinces()
    {
        return DB::table('indonesia_provinces')
            ->orderBy('name')
            ->get(['code', 'name']);
    }

    public function cities(Request $request)
    {
        $request->validate(['province_code' => ['required', 'string']]);

        return DB::table('indonesia_cities')
            ->where('province_code', $request->input('province_code'))
            ->orderBy('name')
            ->get(['code', 'name']);
    }
}
