<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\Contact;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;

class CampaignController extends Controller
{
    public function index()
    {
        // Get campaigns with message counts, optimized query
        $campaigns = Campaign::withCount([
            'messages',
            'messages as sent_count' => function ($query) {
                $query->where('status', 'sent');
            }
        ])->orderBy('created_at', 'desc')->paginate(20); // Pagination for performance
        
        return response()->json($campaigns);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'template_body' => 'required|string',
            'target_group' => 'required|string',
            'media' => 'nullable|file|mimes:jpeg,png,jpg,gif,mp4,avi,mov,pdf,doc,docx|max:16384' // Increased types
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        // Handle media upload securely
        $mediaPath = null;
        if ($request->hasFile('media')) {
            $file = $request->file('media');
            // Ensure unique safe filename
            $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file->getClientOriginalName());
            $destinationPath = public_path('campaign_media');
            if (!file_exists($destinationPath)) {
                mkdir($destinationPath, 0755, true);
            }
            $file->move($destinationPath, $filename);
            $mediaPath = 'campaign_media/' . $filename;
        }

        $campaign = Campaign::create([
            'name' => $request->name,
            'template_body' => $request->template_body,
            'media_path' => $mediaPath,
            'status' => 'draft'
        ]);

        // Efficiently fetch contacts
        $query = Contact::query();
        if ($request->target_group !== 'All Contacts') {
            $query->where('group', $request->target_group);
        }
        
        // Chunk processing for creating messages to avoid memory limits
        $query->chunk(500, function ($contacts) use ($campaign, $request) {
            $messages = [];
            $now = now();
            foreach ($contacts as $contact) {
                $messages[] = [
                    'campaign_id' => $campaign->id,
                    'contact_id' => $contact->id,
                    'body' => $request->template_body, // Store template, parsed at send time
                    'status' => 'pending',
                    'type' => $campaign->media_path ? 'media' : 'text',
                    'created_at' => $now,
                    'updated_at' => $now
                ];
            }
            Message::insert($messages);
        });

        return response()->json($campaign, 201);
    }    

    public function show($id)
    {
        return response()->json(Campaign::with('messages')->findOrFail($id));
    }

    public function destroy($id)
    {
        $campaign = Campaign::findOrFail($id);
        
        // Clean up media file
        if ($campaign->media_path && file_exists(public_path($campaign->media_path))) {
            @unlink(public_path($campaign->media_path));
        }

        $campaign->messages()->delete(); 
        $campaign->delete();
        return response()->json(['message' => 'Campaign deleted']);
    }

    public function duplicate($id)
    {
        $original = Campaign::findOrFail($id);
        
        $new = $original->replicate();
        $new->name = $original->name . ' (Copy)';
        $new->status = 'draft';
        $new->created_at = now();
        $new->updated_at = now();
        $new->save();

        // Optimized batch insert for duplication
        Message::where('campaign_id', $original->id)
            ->chunk(500, function($msgs) use ($new) {
                $data = [];
                $now = now();
                foreach($msgs as $msg) {
                    $data[] = [
                        'campaign_id' => $new->id,
                        'contact_id' => $msg->contact_id,
                        'body' => $msg->body,
                        'status' => 'pending',
                        'type' => $msg->type,
                        'created_at' => $now,
                        'updated_at' => $now
                    ];
                }
                Message::insert($data);
            });

        return response()->json($new);
    }

    public function sendBatch(Request $request, $id)
    {
        $campaign = Campaign::findOrFail($id);
        $limit = $request->input('batch_size', 5);
        
        // Fetch pending messages with contact loaded
        $messages = Message::where('campaign_id', $campaign->id)
            ->where('status', 'pending')
            ->with('contact')
            ->limit($limit) // Use limit instead of take for builder
            ->get();
            
        if ($messages->isEmpty()) {
            // Check if there are any pending messages left at all
            $remaining = Message::where('campaign_id', $campaign->id)->where('status', 'pending')->exists();
            if (!$remaining) {
                $campaign->update(['status' => 'completed']);
                return response()->json(['completed' => true, 'processed' => 0]);
            }
            // If empty but exists (race condition?), just return empty
            return response()->json(['completed' => false, 'processed' => 0]);
        }

        if ($campaign->status !== 'active') {
            $campaign->update(['status' => 'active']);
        }
        
        $processedCount = 0;
        $results = [];

        // Determine node service URL from env or default
        $nodeUrl = env('NODE_SERVICE_URL', 'http://localhost:3001');

        foreach ($messages as $msg) {
            if (!$msg->contact || !$msg->contact->phone) {
                $msg->update(['status' => 'failed']);
                continue;
            }

            try {
                // Dynamic name replacement
                $contactName = $msg->contact->name ?? 'Friend';
                $messageBody = str_replace('{name}', $contactName, $msg->body);
                
                $postData = [
                    'to' => $msg->contact->phone,
                    'message' => $messageBody
                ];

                $response = null;

                // Media Handling
                if ($campaign->media_path && file_exists(public_path($campaign->media_path))) {
                    $filePath = public_path($campaign->media_path);
                    $mimeType = mime_content_type($filePath);
                    $fileName = basename($campaign->media_path);

                    // Send multipart request to Node service
                    $response = Http::timeout(60)
                             ->attach('media', file_get_contents($filePath), $fileName, ['Content-Type' => $mimeType])
                             ->post("{$nodeUrl}/send", $postData);

                } else {
                    // Text only
                    $response = Http::timeout(10)->post("{$nodeUrl}/send", $postData);
                }
                
                if ($response && $response->successful()) {
                    $msg->update(['status' => 'sent']);
                    $results[] = ['phone' => $msg->contact->phone, 'status' => 'sent'];
                } else {
                    $msg->update(['status' => 'failed']);
                    $results[] = ['phone' => $msg->contact->phone, 'status' => 'failed'];
                }
            } catch (\Exception $e) {
                $msg->update(['status' => 'failed']);
                $results[] = ['phone' => $msg->contact->phone, 'status' => 'error', 'error' => $e->getMessage()];
            }
            $processedCount++;
        }

        return response()->json([
            'completed' => false, 
            'processed' => $processedCount,
            'details' => $results
        ]);
    }
}
