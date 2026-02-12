<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

class DatabaseSetupController extends Controller
{
    /**
     * Run migrations programmatically.
     * This is useful for shared hosting environments where terminal access is restricted.
     * 
     * Usage: visit /api/setup-database?key=YOUR_SECRET_KEY
     */
    public function setup(Request $request)
    {
        // Simple security check. 
        // In a real production app, this key should be in .env
        // But for this 'magic link' request, we'll use a hardcoded key that the user knows.
        $key = $request->query('key');
        
        if ($key !== 'magic123') {
            return response()->json(['error' => 'Unauthorized. Invalid key.'], 403);
        }

        try {
            // Increase time limit for migration
            set_time_limit(300);

            // Capture output
            $output = [];

            // 1. Check database connection
            try {
                \DB::connection()->getPdo();
                $output[] = "✅ Database connection successful.";
            } catch (\Exception $e) {
                return response()->json([
                    'error' => 'Database connection failed.',
                    'details' => $e->getMessage(),
                    'hint' => 'Check your .env file DB_ settings.'
                ], 500);
            }

            // 2. Run Migrations
            Artisan::call('migrate', ['--force' => true]);
            $output[] = "✅ Migrations run successfully.";
            $output[] = Artisan::output();

            // 3. Clear Caches (Optional but good)
            Artisan::call('config:clear');
            Artisan::call('cache:clear');
            $output[] = "✅ Cache cleared.";

            // 4. Seed (Optional - create admin user if not exists)
            // Artisan::call('db:seed', ['--force' => true]);
            // $output[] = "✅ Database seeded.";
            
            return response()->json([
                'success' => true,
                'message' => 'Database setup completed successfully!',
                'logs' => $output
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Migration failed',
                'details' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }
}
