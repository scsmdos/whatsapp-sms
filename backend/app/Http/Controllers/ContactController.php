<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Contact::query();

        if ($request->has('group')) {
            $query->where('group', $request->group);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('name')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:contacts,phone',
            'group' => 'nullable|string',
            'email' => 'nullable|email'
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $contact = Contact::create($request->all());

        return response()->json($contact, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $contact = Contact::findOrFail($id);
        return response()->json($contact);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $contact = Contact::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'phone' => 'string|unique:contacts,phone,' . $id,
            'group' => 'nullable|string',
            'email' => 'nullable|email'
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $contact->update($request->all());

        return response()->json($contact);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $contact = Contact::findOrFail($id);
        $contact->delete();
        return response()->json(['message' => 'Contact deleted']);
    }

    public function import(Request $request) 
    {
        // Increase limits for large files
        set_time_limit(0);
        ini_set('memory_limit', '512M');

        $validator = Validator::make($request->all(), [
            'file' => 'required|file' // Relaxed validation
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $file = $request->file('file');
            
            // Check extension manually just to differ from images etc
            $extension = $file->getClientOriginalExtension();
            if (!in_array(strtolower($extension), ['csv', 'txt'])) {
                 return response()->json(['error' => 'Invalid file type. Only CSV or TXT allowed.'], 422);
            }

            $path = $file->getRealPath();
            
            // Detect delimiter if possible, or just default to comma
            $handle = fopen($path, 'r');
            if ($handle === false) {
                throw new \Exception("Cannot open file");
            }

            $imported = 0;
            $duplicates = 0;
            $errors = 0;
            
            // Read header row
            $header = fgetcsv($handle);
            
            // Default indices (fallback)
            $nameIdx = 0;
            $phoneIdx = 1;
            $groupIdx = 2;
            $emailIdx = 3;

            // Smart detection of columns based on header names
            if (!empty($header) && is_array($header)) {
                $lowerHeader = array_map(function($h) {
                    return strtolower(trim($h));
                }, $header);
                
                // Find Name column
                foreach ($lowerHeader as $index => $col) {
                    if (str_contains($col, 'name')) {
                        $nameIdx = $index;
                        break;
                    }
                }
                
                // Find Phone column
                foreach ($lowerHeader as $index => $col) {
                    if (str_contains($col, 'phone') || str_contains($col, 'mobile') || str_contains($col, 'contact') || str_contains($col, 'number')) {
                        $phoneIdx = $index;
                        break;
                    }
                }
                
                // Find Group column
                foreach ($lowerHeader as $index => $col) {
                    if (str_contains($col, 'group') || str_contains($col, 'category') || str_contains($col, 'tag')) {
                        $groupIdx = $index;
                        break;
                    }
                }
                
                // Find Email column
                foreach ($lowerHeader as $index => $col) {
                    if (str_contains($col, 'email')) {
                        $emailIdx = $index;
                        break;
                    }
                }
            }
            
            while (($row = fgetcsv($handle)) !== false) {
                // Ensure row has enough columns for our detected indices
                $maxIdx = max($nameIdx, $phoneIdx);
                if (count($row) <= $maxIdx) {
                    continue; // Skip invalid rows
                }
                
                $name = trim($row[$nameIdx] ?? '');
                // Remove non-numeric characters from phone
                $phone = preg_replace('/[^0-9]/', '', trim($row[$phoneIdx] ?? '')); 

                // If number is 10 digits, prepend 91 default prefix
                if (strlen($phone) === 10) {
                    $phone = '91' . $phone;
                }
                
                if (empty($name) || empty($phone)) {
                    $errors++;
                    continue;
                }
                
                // Check if already exists
                if (Contact::where('phone', $phone)->exists()) {
                    $duplicates++;
                    continue;
                }
                
                // Create contact
                Contact::create([
                    'name' => $name,
                    'phone' => $phone,
                    'group' => isset($row[$groupIdx]) && !empty(trim($row[$groupIdx])) ? trim($row[$groupIdx]) : 'Customers',
                    'email' => isset($row[$emailIdx]) ? trim($row[$emailIdx]) : null
                ]);
                
                $imported++;
            }
            
            fclose($handle);
            
            return response()->json([
                'success' => true,
                'message' => 'Import completed successfully',
                'imported' => $imported,
                'duplicates' => $duplicates,
                'errors' => $errors
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Import failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:contacts,id'
        ]);

        Contact::whereIn('id', $request->ids)->delete();

        return response()->json(['message' => 'Contacts deleted successfully']);
    }
}
