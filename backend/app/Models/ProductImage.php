<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ProductImage extends Model
{
    protected $fillable = [
        'product_id', 'path', 'url', 'sort', 'is_main', 'session_id',
    ];

    protected $casts = [
        'is_main' => 'boolean',
        'sort' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getAbsoluteUrlAttribute(): string
    {
        if (str_starts_with($this->url, 'http')) {
            return $this->url;
        }
        return rtrim(config('app.url'), '/') . '/' . ltrim($this->url, '/');
    }

    public function deleteFile(): bool
    {
        try {
            if ($this->path && Storage::disk('public')->exists($this->path)) {
                return Storage::disk('public')->delete($this->path);
            }
        } catch (\Throwable $e) {
            report($e);
        }
        return true;
    }
}
