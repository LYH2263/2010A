<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    const SOURCE_MANUAL_ADJUST = 'manual_adjust';
    const SOURCE_ORDER_DEDUCT = 'order_deduct';
    const SOURCE_ORDER_CANCEL = 'order_cancel';
    const SOURCE_REFUND_RESTORE = 'refund_restore';

    const RELATED_TYPE_ORDER = 'order';
    const RELATED_TYPE_REFUND = 'refund';

    public static array $sourceTypeLabels = [
        self::SOURCE_MANUAL_ADJUST => '手动调整',
        self::SOURCE_ORDER_DEDUCT => '下单扣减',
        self::SOURCE_ORDER_CANCEL => '取消订单回补',
        self::SOURCE_REFUND_RESTORE => '退款回补',
    ];

    protected $fillable = [
        'product_id',
        'source_type',
        'before_quantity',
        'delta',
        'after_quantity',
        'related_type',
        'related_id',
        'operator_id',
        'reason',
    ];

    protected $casts = [
        'before_quantity' => 'integer',
        'delta' => 'integer',
        'after_quantity' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function getSourceTypeLabelAttribute(): string
    {
        return self::$sourceTypeLabels[$this->source_type] ?? $this->source_type;
    }
}
