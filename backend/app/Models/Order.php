<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Support\BcMath;

class Order extends Model
{
    const STATUS_PENDING = 'pending';
    const STATUS_PAID = 'paid';
    const STATUS_SHIPPED = 'shipped';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_COMPLETED = 'completed';

    const REFUND_NONE = 'none';
    const REFUND_PARTIAL = 'partial';
    const REFUND_FULL = 'full';

    protected $fillable = ['order_no', 'status', 'original_amount', 'total_amount', 'discount_amount', 'remark', 'customer_id'];

    protected $appends = ['refund_status', 'total_refunded_amount'];

    protected $casts = [
        'original_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function coupons(): HasMany
    {
        return $this->hasMany(OrderCoupon::class);
    }

    public function getRefundStatusAttribute(): string
    {
        $approvedRefunds = $this->refunds()->whereIn('status', [Refund::STATUS_APPROVED, Refund::STATUS_COMPLETED])->get();
        if ($approvedRefunds->isEmpty()) {
            return self::REFUND_NONE;
        }

        $totalRefunded = 0;
        foreach ($approvedRefunds as $refund) {
            $totalRefunded += (float) $refund->refund_amount;
        }

        if (BcMath::comp((string) $totalRefunded, (string) $this->total_amount, 2) >= 0) {
            return self::REFUND_FULL;
        }

        return self::REFUND_PARTIAL;
    }

    public function getTotalRefundedAmountAttribute(): string
    {
        $amount = $this->refunds()
            ->whereIn('status', [Refund::STATUS_APPROVED, Refund::STATUS_COMPLETED])
            ->sum('refund_amount');
        return number_format((float) $amount, 2, '.', '');
    }

    public function canApplyRefund(): bool
    {
        if (!in_array($this->status, [self::STATUS_PAID, self::STATUS_SHIPPED, self::STATUS_COMPLETED], true)) {
            return false;
        }
        return $this->refund_status !== self::REFUND_FULL;
    }
}
