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
        'category_id', 'name', 'sku', 'description', 'price', 'stock', 'status', 'alert_threshold'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'stock' => 'integer',
        'status' => 'integer',
        'alert_threshold' => 'integer',
    ];

    protected $appends = ['min_price', 'max_price', 'total_stock', 'has_multi_sku', 'main_image_url', 'main_image_thumbnail', 'stock_by_warehouse'];

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

    public function warehouseStocks(): HasMany
    {
        return $this->hasMany(ProductStock::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort')->orderBy('id');
    }

    public function mainImage(): HasOne
    {
        return $this->hasOne(ProductImage::class)->where('is_main', true);
    }

    public function getMainImageUrlAttribute(): ?string
    {
        if ($this->relationLoaded('images')) {
            $main = $this->images->firstWhere('is_main', true) ?? $this->images->first();
            return $main?->absolute_url ?? $main?->url;
        }
        if ($this->relationLoaded('mainImage')) {
            return $this->mainImage?->absolute_url ?? $this->mainImage?->url;
        }
        $img = $this->images()->where('is_main', true)->first() ?? $this->images()->first();
        return $img?->absolute_url ?? $img?->url;
    }

    public function getMainImageThumbnailAttribute(): ?string
    {
        return $this->main_image_url;
    }

    protected static function booted(): void
    {
        static::deleting(function (Product $product) {
            foreach ($product->images as $image) {
                $image->deleteFile();
            }
        });
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
        if ($this->relationLoaded('warehouseStocks') && $this->warehouseStocks->isNotEmpty()) {
            return (int) $this->warehouseStocks->sum('stock');
        }
        if ($this->relationLoaded('skus') && $this->skus->isNotEmpty()) {
            $skuIds = $this->skus->pluck('id');
            $stock = \App\Models\ProductStock::whereIn('product_sku_id', $skuIds)->sum('stock');
            if ($stock > 0) {
                return (int) $stock;
            }
            return (int) $this->skus->sum('stock');
        }
        $stock = \App\Models\ProductStock::where('product_id', $this->id)
            ->whereNull('product_sku_id')
            ->sum('stock');
        if ($stock > 0) {
            return (int) $stock;
        }
        return (int) $this->stock;
    }

    public function getStockByWarehouseAttribute(): array
    {
        $result = [];
        if ($this->relationLoaded('warehouseStocks') && $this->warehouseStocks->isNotEmpty()) {
            foreach ($this->warehouseStocks as $ws) {
                $key = $ws->product_sku_id ? "sku_{$ws->product_sku_id}" : 'product';
                if (!isset($result[$ws->warehouse_id])) {
                    $result[$ws->warehouse_id] = [
                        'warehouse_id' => $ws->warehouse_id,
                        'warehouse_name' => $ws->warehouse?->name ?? '',
                        'warehouse_code' => $ws->warehouse?->code ?? '',
                        'total_stock' => 0,
                        'skus' => [],
                    ];
                }
                $result[$ws->warehouse_id][$key] = $ws->stock;
                $result[$ws->warehouse_id]['total_stock'] += $ws->stock;
                if ($ws->product_sku_id) {
                    $result[$ws->warehouse_id]['skus'][$ws->product_sku_id] = $ws->stock;
                }
            }
        } else {
            $stocks = \App\Models\ProductStock::with('warehouse')
                ->where('product_id', $this->id)
                ->get();
            foreach ($stocks as $ws) {
                if (!isset($result[$ws->warehouse_id])) {
                    $result[$ws->warehouse_id] = [
                        'warehouse_id' => $ws->warehouse_id,
                        'warehouse_name' => $ws->warehouse?->name ?? '',
                        'warehouse_code' => $ws->warehouse?->code ?? '',
                        'total_stock' => 0,
                        'skus' => [],
                    ];
                }
                if ($ws->product_sku_id) {
                    $result[$ws->warehouse_id]['skus'][$ws->product_sku_id] = $ws->stock;
                } else {
                    $result[$ws->warehouse_id]['product_stock'] = $ws->stock;
                }
                $result[$ws->warehouse_id]['total_stock'] += $ws->stock;
            }
        }
        return array_values($result);
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
