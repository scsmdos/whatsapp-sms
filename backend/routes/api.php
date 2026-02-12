<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\WhatsappController;
use App\Models\User;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DatabaseSetupController;

// Magic Setup Route (for deployment)
Route::get('/setup-database', [DatabaseSetupController::class, 'setup']);

// Auth Routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::middleware('auth:sanctum')->post('/auth/logout', [AuthController::class, 'logout']);
Route::middleware('auth:sanctum')->get('/auth/me', [AuthController::class, 'me']);



// WhatsApp Status & Chats (No Auth Required for Debugging)
Route::get('whatsapp/status', [WhatsappController::class, 'status']);
Route::post('whatsapp/initialize', [WhatsappController::class, 'initialize']);
Route::post('whatsapp/disconnect', [WhatsappController::class, 'disconnect']);
Route::post('whatsapp/reset-session', [WhatsappController::class, 'resetSession']);
Route::get('whatsapp/chats', [WhatsappController::class, 'getChats']);
Route::get('whatsapp/chats/{chatId}/messages', [WhatsappController::class, 'getChatMessages']);
Route::post('whatsapp/send', [WhatsappController::class, 'send']);

// Protected Routes
Route::middleware('auth:sanctum')->group(function () {
    // Contacts
    Route::apiResource('contacts', ContactController::class);
    Route::post('contacts/import', [ContactController::class, 'import']);
    Route::post('contacts/bulk-delete', [ContactController::class, 'bulkDelete']);

    // Users
    Route::apiResource('users', UserController::class);

    // Messages
    Route::apiResource('messages', MessageController::class);
    
    // Campaigns
    Route::post('campaigns/{id}/start', [CampaignController::class, 'start']);
    Route::post('campaigns/{id}/duplicate', [CampaignController::class, 'duplicate']);
    Route::post('campaigns/{id}/send-batch', [CampaignController::class, 'sendBatch']);
    Route::apiResource('campaigns', CampaignController::class);

    // Dashboard
    Route::get('dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('dashboard/recent-activity', [DashboardController::class, 'recentActivity']);
    Route::get('dashboard/chart-data', [DashboardController::class, 'chartData']);

    // Analytics
    Route::get('analytics', [AnalyticsController::class, 'index']);

    // Templates
    Route::apiResource('templates', App\Http\Controllers\TemplateController::class);

    // Settings
    Route::get('settings', [SettingController::class, 'index']);
    Route::put('settings', [SettingController::class, 'update']);
    Route::post('settings/api-key/regenerate', [SettingController::class, 'regenerateApiKey']);
    Route::get('settings/api-key', [SettingController::class, 'getApiKey']);
    Route::put('settings/profile', [SettingController::class, 'updateProfile']);


    // WhatsApp Proxy Routes (Except Status)
    Route::prefix('whatsapp')->group(function () {
        Route::post('initialize', [WhatsappController::class, 'initialize']);
        Route::post('disconnect', [WhatsappController::class, 'disconnect']);
        Route::post('reset-session', [WhatsappController::class, 'resetSession']);
        Route::post('send', [WhatsappController::class, 'send']);
        Route::get('chats', [WhatsappController::class, 'getChats']);
        Route::get('chats/{chatId}/messages', [WhatsappController::class, 'getChatMessages']);
    });
});

