<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'product_id', 'product_sku_id', 'warehouse_id', 'product_name', 'sku_code', 'sku_specs', 'price', 'quantity', 'subtotal'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'quantity' => 'integer',
        'subtotal' => 'decimal:2',
        'sku_specs' => 'array',
    ];

    protected $appends = ['spec_text'];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

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

    public function getSpecTextAttribute(): string
    {
        if (empty($this->sku_specs)) {
            return '';
        }
        $parts = [];
        foreach ($this->sku_specs as $name => $value) {
            $parts[] = "{$name}: {$value}";
        }
        return implode(' / ', $parts);
    }
}
