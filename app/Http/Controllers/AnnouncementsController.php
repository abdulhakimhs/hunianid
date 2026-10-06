<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementsController extends Controller
{
    public function index(Request $request): Response
    {
        $areaIds = $request->user()->units()
            ->wherePivot('status', 'active')
            ->pluck('units.area_id')
            ->unique();

        $announcements = Announcement::whereIn('area_id', $areaIds)
            ->with('area:id,name')
            ->latest()
            ->get()
            ->map(fn (Announcement $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'body' => $a->body,
                'areaName' => $a->area->name,
                'createdAt' => $a->created_at?->toIso8601String(),
            ]);

        return Inertia::render('tenant/notifications', [
            'announcements' => $announcements,
        ]);
    }
}
