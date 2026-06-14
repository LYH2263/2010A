<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefundItem extends Model
{
    protected $fillable = ['refund_id', 'order_item_id', 'product_id', 'product_sku_id', 'product_name', 'sku_code', 'sku_specs', 'price', 'quantity', 'subtotal'];

    protected $casts = [
        'price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'quantity' => 'integer',
        'sku_specs' => 'array',
    ];

    protected $appends = ['spec_text'];

    public function refund(): BelongsTo
    {
        return $this->belongsTo(Refund::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function sku(): BelongsTo
    {
        return $this->belongsTo(ProductSku::class, 'product_sku_id');
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
