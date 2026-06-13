<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    const STATUS_ACTIVE = 1;
    const STATUS_INACTIVE = 0;

    protected $fillable = [
        'category_id', 'name', 'sku', 'description', 'price', 'stock', 'status'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'stock' => 'integer',
        'status' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class)->orderBy('id', 'desc');
    }

    public function scopeOnSale($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }
}
