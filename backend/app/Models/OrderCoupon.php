<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderCoupon extends Model
{
    const STATUS_USED = 'used';
    const STATUS_RELEASED = 'released';
    const STATUS_PARTIAL_RELEASED = 'partial_released';

    protected $fillable = [
        'order_id', 'coupon_id', 'coupon_code', 'coupon_name',
        'coupon_type', 'coupon_value', 'discount_amount',
        'status', 'released_amount',
    ];

    protected $casts = [
        'coupon_value' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'released_amount' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }
}
