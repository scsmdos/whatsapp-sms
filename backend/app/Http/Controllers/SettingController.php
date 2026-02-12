<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingController extends Controller
{
    /**
     * Get all settings.
     */
    public function index()
    {
        // Convert to key-value pair for easy frontend consumption
        $settings = Setting::all()->pluck('value', 'key');
        
        // Ensure defaults if not present
        if (!isset($settings['sending_delay'])) {
            $settings['sending_delay'] = 5;
        }

        // Return user profile info (name, email) as well? 
        // Or handle that in a separate profile endpoint?
        // Let's include user info here for the Settings page convenience if needed, 
        // but typically the frontend already has the user context.

        return response()->json($settings);
    }

    /**
     * Update settings.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'nullable|string' // Use string for storage, frontend can send whatever
        ]);

        foreach ($validated['settings'] as $key => $value) {
            Setting::set($key, $value);
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }

    /**
     * Regenerate API Key (Simulated or Real).
     * Since we are using Sanctum tokens, we can create a new long-lived token.
     */
    public function regenerateApiKey(Request $request)
    {
        $user = $request->user();
        
        // Revoke old "API Key" tokens if we want to enforce single key policy
        $user->tokens()->where('name', 'API Key')->delete();

        // Create new token
        $token = $user->createToken('API Key')->plainTextToken;

        return response()->json(['apiKey' => $token]);
    }
    
    /**
     * Get the current API Key (if exists).
     * Note: Pure Sanctum tokens are hashed, so we can't retrieve the original plain text once generated.
     * We have to generate a new one if lost. 
     * However, for this "Settings" page simulation, we might just return a truncated version or 
     * if the user really wants to see it, they have to regenerate.
     * Or we can store a specific "displayable" API key in the settings table if it's not the Sanctum token.
     * 
     * For this implementation, let's assume the "API Key" displayed is the Sanctum token associated with "API Key".
     * Since we can't show it, we'll return a masked version or null if not set.
     */
    public function getApiKey(Request $request)
    {
        // We cannot retrieve the plain text token. 
        // We can only check if one exists.
        $hasKey = $request->user()->tokens()->where('name', 'API Key')->exists();
        
        return response()->json([
            'hasKey' => $hasKey,
            'preview' => $hasKey ? 'sk_live_... (Regenerate to view)' : null
        ]);
    }

    /**
     * Update User Profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            // Email updates might require verification, skipping for now
        ]);

        $user->update([
            'name' => $validated['name']
        ]);

        return response()->json(['message' => 'Profile updated successfully', 'user' => $user]);
    }
}
