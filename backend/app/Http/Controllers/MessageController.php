<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Message;
use App\Models\Contact;
use Illuminate\Support\Facades\Http;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        $query = Message::query();

        if ($request->has('contact_id')) {
            $query->where('contact_id', $request->contact_id);
        }

        // Return latest messages
        return response()->json($query->orderBy('created_at', 'asc')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'contact_id' => 'required|exists:contacts,id',
            'body' => 'required|string',
            'type' => 'in:text,image,video,document' // Optional validation
        ]);

        $contact = Contact::find($request->contact_id);

        // 1. Save to Database
        $message = Message::create([
            'contact_id' => $contact->id,
            'campaign_id' => null, // Regular chat
            'type' => 'text',
            'body' => $request->body,
            'status' => 'pending',
            'direction' => 'outbound'
        ]);

        // 2. Send via Node Service (simulated internal call or Http)
        try {
            // We can call the Node service directly
            $nodeUrl = env('NODE_SERVICE_URL', 'http://localhost:3001') . '/send';
            $response = Http::post($nodeUrl, [
                'to' => $contact->phone,
                'message' => $request->body
            ]);
            
            if ($response->successful()) {
                $message->update(['status' => 'sent', 'message_id' => $response['messageId'] ?? null]);
            } else {
                $message->update(['status' => 'failed']);
            }
        } catch (\Exception $e) {
            $message->update(['status' => 'failed']);
            // Allow failure to not block UI (show error state later if needed)
        }

        return response()->json($message, 201);
    }
    
    // Retrieve chat list (contacts with their latest message)
    // Custom endpoint needed or handled in ContactController?
    // For now, frontend can fetch all contacts and then fetch messages for selected one.
}
