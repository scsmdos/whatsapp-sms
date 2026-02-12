<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class DatabaseSetupController extends Controller
{
    public function setup(Request $request)
    {
        // Security key check
        if ($request->query('key') !== 'magic123') {
            return response()->json(['error' => 'Invalid security key'], 403);
        }

        try {
            // Increase execution time for deep migrations
            set_time_limit(300);

            // Run Laravel Migrations
            Artisan::call('migrate', ['--force' => true]);
            $output = Artisan::output();

            return response()->json([
                'success' => true,
                'message' => 'Database setup completed successfully!',
                'details' => $output
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Migration failed',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}
