<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WhatsappController extends Controller
{
    private $nodeUrl;

    public function __construct()
    {
        $this->nodeUrl = env('NODE_SERVICE_URL', 'http://localhost:3001');
    }

    public function status()
    {
        try {
            $response = Http::get("{$this->nodeUrl}/status");
            return $response->json();
        } catch (\Exception $e) {
            return response()->json(['connected' => false, 'error' => 'Node service offline'], 503);
        }
    }

    public function initialize()
    {
        try {
            $response = Http::post("{$this->nodeUrl}/initialize");
            return $response->json();
        } catch (\Exception $e) {
            return response()->json(['error' => 'Node service offline'], 503);
        }
    }

    public function disconnect()
    {
        try {
            $response = Http::post("{$this->nodeUrl}/disconnect");
            return $response->json();
        } catch (\Exception $e) {
            return response()->json(['error' => 'Node service offline'], 503);
        }
    }

    public function send(Request $request)
    {
        try {
            // Forward file uploads properly if needed, but for simplicity just forward JSON
            // If file upload is needed, Http::attach() is required.
            // But frontend sends FormData.
            
            if ($request->hasFile('media')) {
                $response = Http::attach(
                    'media',
                    file_get_contents($request->file('media')->path()),
                    $request->file('media')->getClientOriginalName()
                )->post("{$this->nodeUrl}/send", $request->except('media'));
            } else {
                $response = Http::post("{$this->nodeUrl}/send", $request->all());
            }

            return $response->json();
        } catch (\Exception $e) {
            return response()->json(['error' => 'Node service offline or error sending', 'details' => $e->getMessage()], 503);
        }
    }

    public function resetSession()
    {
        try {
            $response = Http::post("{$this->nodeUrl}/reset-session");
            return $response->json();
        } catch (\Exception $e) {
            return response()->json(['error' => 'Node service offline'], 503);
        }
    }

    public function getChats()
    {
        try {
            $response = Http::get("{$this->nodeUrl}/chats");
            return $response->json();
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch chats', 'chats' => []], 503);
        }
    }

    public function getChatMessages($chatId)
    {
        try {
            $response = Http::get("{$this->nodeUrl}/chats/{$chatId}/messages");
            return $response->json();
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch messages', 'messages' => []], 503);
        }
    }
}
