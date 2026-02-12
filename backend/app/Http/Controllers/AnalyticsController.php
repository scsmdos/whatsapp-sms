<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Campaign;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function index()
    {
        // Total stats
        $totalMessages = Message::count();
        $totalSent = Message::where('status', 'sent')->count();
        $totalFailed = Message::where('status', 'failed')->count();
        $totalPending = Message::where('status', 'pending')->count();
        $totalContacts = Contact::count();

        // Calculate rates
        $deliveryRate = $totalMessages > 0 ? round(($totalSent / $totalMessages) * 100, 1) : 0;
        $failedRate = $totalMessages > 0 ? round(($totalFailed / $totalMessages) * 100, 1) : 0;
        
        // Let's assume response rate is 0 for now as we don't track incoming messages yet
        // or we could use read receipts if available, but schema doesn't show it.
        $responseRate = 0; 

        // Weekly Performance Data
        $dates = collect();
        for ($i = 6; $i >= 0; $i--) {
            $dates->push(Carbon::now()->subDays($i)->format('Y-m-d'));
        }

        $weeklyData = $dates->map(function ($date) {
            $dayName = Carbon::parse($date)->format('D'); // Mon, Tue...
            
            $sent = Message::whereDate('created_at', $date)
                           ->where('status', 'sent')
                           ->count();
            
            $failed = Message::whereDate('created_at', $date)
                             ->where('status', 'failed')
                             ->count();

             // pending as delivered or just pending? Let's use pending for now so graph is complete
            $pending = Message::whereDate('created_at', $date)
                              ->where('status', 'pending')
                              ->count();

            // We can rename 'pending' to 'Delivered' in the frontend chart if we want to mimic the current look 
            // but for accuracy, let's just send what we have. 
            // The frontend chart expects 'Sent', 'Delivered', 'Failed'.
            // Our 'sent' corresponds to 'Delivered' (successful). 
            // Let's map 'pending' to 'Sent' (queued but not confirmed delivered) or just ignore?
            // Current chart has: Sent, Delivered, Failed.
            // Let's map: 
            // - our 'sent' -> chart 'Delivered' (successfully processed)
            // - our 'pending' -> chart 'Sent' (in queue/submitted)
            // - our 'failed' -> chart 'Failed'
            
            return [
                'name' => $dayName,
                'Sent' => $pending, 
                'Delivered' => $sent,
                'Failed' => $failed
            ];
        });

        // Status Breakdown for Pie Chart
        // Frontend expects: [{ name: 'Delivered', value: 85, color: '...' }, ...]
        $pieData = [
            [
                'name' => 'Delivered', 
                'value' => $totalSent, 
                'color' => '#25D366'
            ],
            [
                'name' => 'Pending', 
                'value' => $totalPending, 
                'color' => '#FBBC05'
            ],
            [
                'name' => 'Failed', 
                'value' => $totalFailed, 
                'color' => '#EA4335'
            ],
        ];

        return response()->json([
            'totalMessages' => $totalMessages,
            'deliveryRate' => $deliveryRate,
            'failedRate' => $failedRate,
            'responseRate' => $responseRate,
            'weeklyData' => $weeklyData,
            'pieData' => $pieData,
            'totalContacts' => $totalContacts
        ]);
    }
}
