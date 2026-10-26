<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PanicAlert;
use Illuminate\Http\Request;

class PanicAlertsController extends Controller
{
    /**
     * No full panic-alert CRUD page exists (or is needed) today — this is the one
     * action the units map needs: let an admin clear an alert off the live map.
     */
    public function resolve(Request $request, PanicAlert $panicAlert)
    {
        $area = $request->attributes->get('adminArea');

        abort_unless($panicAlert->area_id === $area->id, 404);

        if ($panicAlert->isActive()) {
            // resolved_at/resolved_by are deliberately not mass-assignable — this
            // action is the only place they're ever set.
            $panicAlert->forceFill([
                'resolved_at' => now(),
                'resolved_by' => $request->user()->id,
            ])->save();
        }

        return response()->json(['ok' => true]);
    }
}
