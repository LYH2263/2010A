<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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

    protected $appends = ['min_price', 'max_price', 'total_stock', 'has_multi_sku'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function skus(): HasMany
    {
        return $this->hasMany(ProductSku::class)->orderBy('is_default', 'desc')->orderBy('id');
    }

    public function defaultSku(): HasOne
    {
        return $this->hasOne(ProductSku::class)->where('is_default', true);
    }

    public function specs(): HasMany
    {
        return $this->hasMany(ProductSpec::class)->orderBy('sort');
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

    public function getMinPriceAttribute(): string
    {
        if ($this->relationLoaded('skus') && $this->skus->isNotEmpty()) {
            return (string) $this->skus->min('price');
        }
        return (string) $this->price;
    }

    public function getMaxPriceAttribute(): string
    {
        if ($this->relationLoaded('skus') && $this->skus->isNotEmpty()) {
            return (string) $this->skus->max('price');
        }
        return (string) $this->price;
    }

    public function getTotalStockAttribute(): int
    {
        if ($this->relationLoaded('skus') && $this->skus->isNotEmpty()) {
            return (int) $this->skus->sum('stock');
        }
        return (int) $this->stock;
    }

    public function getHasMultiSkuAttribute(): bool
    {
        if ($this->relationLoaded('skus')) {
            return $this->skus->count() > 1;
        }
        return false;
    }

    public function getPriceRangeAttribute(): string
    {
        $min = $this->min_price;
        $max = $this->max_price;
        if ($min === $max) {
            return '¥' . number_format((float) $min, 2);
        }
        return '¥' . number_format((float) $min, 2) . ' ~ ¥' . number_format((float) $max, 2);
    }
}
