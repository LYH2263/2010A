<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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
