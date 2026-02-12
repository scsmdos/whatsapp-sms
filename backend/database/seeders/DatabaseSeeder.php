<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Contact;
use App\Models\Campaign;
use App\Models\Message;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Admin User
        $user = User::firstOrCreate([
            'email' => 'admin@example.com',
        ], [
            'name' => 'Admin User',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
        ]);

        // Contacts
        $contacts = [
            ['name' => 'Rahul Sharma', 'phone' => '919876543210', 'group' => 'Customers'],
            ['name' => 'Priya Patel', 'phone' => '918765432109', 'group' => 'Leads'],
            ['name' => 'Amit Singh', 'phone' => '917654321098', 'group' => 'Friends'],
            ['name' => 'Sneha Gupta', 'phone' => '916543210987', 'group' => 'Customers'],
            ['name' => 'Vikram Malhotra', 'phone' => '915432109876', 'group' => 'VIP'],
        ];

        foreach ($contacts as $contact) {
            Contact::firstOrCreate(['phone' => $contact['phone']], $contact);
        }

        // Campaign
        $campaign = Campaign::create([
            'name' => 'Diwali Offer',
            'template_body' => 'Happy Diwali! Get 50% off on all products.',
            'status' => 'active'
        ]);

        // Messages (Fake history)
        if ($contact = Contact::first()) {
            Message::create([
                'contact_id' => $contact->id,
                'campaign_id' => $campaign->id,
                'body' => $campaign->template_body,
                'status' => 'sent',
                'sent_at' => now()->subHours(2)
            ]);
        }
    }
}
