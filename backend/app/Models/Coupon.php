<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Coupon extends Model
{
    const TYPE_FIXED = 'fixed';
    const TYPE_PERCENT = 'percent';

    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';

    protected $fillable = [
        'code', 'name', 'type', 'value', 'min_amount',
        'valid_from', 'valid_until', 'total_quantity', 'used_quantity',
        'category_ids', 'status', 'description',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'min_amount' => 'decimal:2',
        'total_quantity' => 'integer',
        'used_quantity' => 'integer',
        'category_ids' => 'array',
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
    ];

    public function orderCoupons(): HasMany
    {
        return $this->hasMany(OrderCoupon::class);
    }

    protected function remainingQuantity(): Attribute
    {
        return Attribute::make(
            get: fn () => max(0, $this->total_quantity - $this->used_quantity),
        );
    }

    public function isAvailable(): bool
    {
        if ($this->status !== self::STATUS_ACTIVE) {
            return false;
        }
        $now = now();
        if ($this->valid_from && $now->lt($this->valid_from)) {
            return false;
        }
        if ($this->valid_until && $now->gt($this->valid_until)) {
            return false;
        }
        if ($this->remaining_quantity <= 0) {
            return false;
        }
        return true;
    }

    public function isCategoryAllowed(int $categoryId): bool
    {
        if ($this->category_ids === null || count($this->category_ids) === 0) {
            return true;
        }
        return in_array($categoryId, $this->category_ids, true);
    }
}
