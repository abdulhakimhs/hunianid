<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Services\AnnouncementNotificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementsController extends Controller
{
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $announcements = Announcement::where('area_id', $area->id)
            ->with('author:id,name')
            ->latest()
            ->get()
            ->map(fn (Announcement $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'body' => $a->body,
                'sendWhatsapp' => $a->send_whatsapp,
                'broadcastSentAt' => $a->broadcast_sent_at?->toIso8601String(),
                'sentCount' => $a->sent_count,
                'authorName' => $a->author->name,
                'createdAt' => $a->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/announcements/index', [
            'announcements' => $announcements,
        ]);
    }

    public function store(Request $request, AnnouncementNotificationService $notifier)
    {
        $area = $request->attributes->get('adminArea');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:2000'],
            'send_whatsapp' => ['boolean'],
        ]);

        $announcement = Announcement::create([
            'area_id' => $area->id,
            'user_id' => $request->user()->id,
            'title' => $data['title'],
            'body' => $data['body'],
            'send_whatsapp' => $data['send_whatsapp'] ?? true,
        ]);

        $notifier->broadcast($announcement);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pengumuman berhasil dibuat.')]);

        return redirect()->route('admin.announcements.index');
    }

    public function update(Request $request, Announcement $announcement)
    {
        $area = $request->attributes->get('adminArea');

        if ($announcement->area_id !== $area->id) {
            abort(404);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $announcement->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pengumuman diperbarui.')]);

        return redirect()->route('admin.announcements.index');
    }

    public function destroy(Request $request, Announcement $announcement)
    {
        $area = $request->attributes->get('adminArea');

        if ($announcement->area_id !== $area->id) {
            abort(404);
        }

        $announcement->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pengumuman dihapus.')]);

        return redirect()->route('admin.announcements.index');
    }
}
