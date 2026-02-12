<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->index('name');
            $table->index('phone'); // Phone is likely already unique/indexed but good to ensure
            $table->index('group');
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->index('status');
            $table->index('created_at');
            $table->index('campaign_id');
            // Composite index for fast filtering
            $table->index(['status', 'created_at']);
        });

        Schema::table('campaigns', function (Blueprint $table) {
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropIndex(['name']);
            $table->dropIndex(['phone']);
            $table->dropIndex(['group']);
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['campaign_id']);
            $table->dropIndex(['status', 'created_at']);
        });

        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });
    }
};
