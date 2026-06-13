<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductSku extends Model
{
    protected $fillable = [
        'product_id', 'sku', 'price', 'stock', 'is_default', 'alert_threshold'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'stock' => 'integer',
        'is_default' => 'boolean',
        'alert_threshold' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function specValues(): BelongsToMany
    {
        return $this->belongsToMany(
            ProductSpecValue::class,
            'product_sku_spec_value',
            'product_sku_id',
            'product_spec_value_id'
        )->withPivot('product_spec_id');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function warehouseStocks(): HasMany
    {
        return $this->hasMany(ProductStock::class);
    }

    public function getTotalStockAttribute(): int
    {
        if ($this->relationLoaded('warehouseStocks') && $this->warehouseStocks->isNotEmpty()) {
            return (int) $this->warehouseStocks->sum('stock');
        }
        $stock = \App\Models\ProductStock::where('product_sku_id', $this->id)->sum('stock');
        if ($stock > 0) {
            return (int) $stock;
        }
        return (int) $this->stock;
    }

    public function getStockByWarehouseAttribute(): array
    {
        if ($this->relationLoaded('warehouseStocks') && $this->warehouseStocks->isNotEmpty()) {
            return $this->warehouseStocks->map(function ($ws) {
                return [
                    'warehouse_id' => $ws->warehouse_id,
                    'warehouse_name' => $ws->warehouse?->name ?? '',
                    'warehouse_code' => $ws->warehouse?->code ?? '',
                    'stock' => $ws->stock,
                    'available_stock' => $ws->available_stock,
                ];
            })->toArray();
        }
        return \App\Models\ProductStock::with('warehouse')
            ->where('product_sku_id', $this->id)
            ->get()
            ->map(function ($ws) {
                return [
                    'warehouse_id' => $ws->warehouse_id,
                    'warehouse_name' => $ws->warehouse?->name ?? '',
                    'warehouse_code' => $ws->warehouse?->code ?? '',
                    'stock' => $ws->stock,
                    'available_stock' => $ws->available_stock,
                ];
            })->toArray();
    }

    public function getSpecTextAttribute(): string
    {
        $specs = $this->specValues->sortBy(function ($sv) {
            return $sv->spec->sort ?? 0;
        });
        return $specs->pluck('value')->implode(' / ');
    }

    public function getSpecArrayAttribute(): array
    {
        $result = [];
        foreach ($this->specValues as $sv) {
            $result[$sv->spec->name] = $sv->value;
        }
        return $result;
    }
}
