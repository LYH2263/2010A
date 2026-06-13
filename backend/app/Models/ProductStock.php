<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductStock extends Model
{
    protected $fillable = [
        'product_id', 'product_sku_id', 'warehouse_id', 'stock', 'reserved_stock'
    ];

    protected $casts = [
        'stock' => 'integer',
        'reserved_stock' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function sku(): BelongsTo
    {
        return $this->belongsTo(ProductSku::class, 'product_sku_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function getAvailableStockAttribute(): int
    {
        return max(0, $this->stock - $this->reserved_stock);
    }
}
