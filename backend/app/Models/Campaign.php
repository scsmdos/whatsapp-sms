<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'template_body', 'media_path', 'status'];
    
    public function messages()
    {
        return $this->hasMany(Message::class);
    }
}
