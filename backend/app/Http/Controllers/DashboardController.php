<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Campaign;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        $totalMessages = Message::count();
        $successful = Message::where('status', 'sent')->orWhere('status', 'delivered')->count();
        $failed = Message::where('status', 'failed')->count();
        
        $percentage = $totalMessages > 0 ? round(($successful / $totalMessages) * 100, 1) : 0;

        return response()->json([
            'totalContacts' => Contact::count(),
            'totalMessages' => $totalMessages,
            'totalCampaigns' => Campaign::count(),
            'successRate' => $percentage,
            'sentMessages' => $successful,
            'failedMessages' => $failed,
            'newContacts' => Contact::where('created_at', '>=', Carbon::now()->subDays(7))->count()
        ]);
    }

    public function recentActivity()
    {
        // Combine latest campaigns and imported contacts for activity feed
        $campaigns = Campaign::latest()->take(3)->get()->map(function($c) {
            return [
                'message' => 'New campaign created: "' . $c->name . '"',
                'time' => $c->created_at->diffForHumans(),
                'type' => 'success'
            ];
        });

        $contacts = Contact::latest()->take(3)->get()->map(function($c) {
            return [
                'message' => 'New contact added: ' . $c->name,
                'time' => $c->created_at->diffForHumans(),
                'type' => 'info'
            ];
        });

        // Merge and sort
        $activity = $campaigns->merge($contacts)->sortByDesc('created_at')->values()->all();

        return response()->json($activity);
    }

    public function chartData()
    {
        // Get message counts for last 7 days dynamically
        $data = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $count = Message::whereDate('created_at', $date->format('Y-m-d'))->count();
            $data[] = [
                'date' => $date->format('D'), // Mon, Tue...
                'messages' => $count,
                // 'campaigns' => Campaign::whereDate('created_at', $date->format('Y-m-d'))->count()
            ];
        }
        
        return response()->json($data);
    }
}
