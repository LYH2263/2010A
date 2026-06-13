<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    const STATUS_DRAFT = 0;
    const STATUS_SUBMITTED = 1;
    const STATUS_STOCKED = 2;

    public static array $statusLabels = [
        self::STATUS_DRAFT => '草稿',
        self::STATUS_SUBMITTED => '已提交',
        self::STATUS_STOCKED => '已入库',
    ];

    protected $fillable = [
        'order_no',
        'supplier_id',
        'status',
        'total_amount',
        'remark',
        'created_by',
        'submitted_at',
        'stocked_at',
    ];

    protected $casts = [
        'status' => 'integer',
        'total_amount' => 'decimal:2',
        'submitted_at' => 'datetime',
        'stocked_at' => 'datetime',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getStatusLabelAttribute(): string
    {
        return self::$statusLabels[$this->status] ?? '未知';
    }

    public function canSubmit(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function canStockIn(): bool
    {
        return $this->status === self::STATUS_SUBMITTED;
    }

    public function canEdit(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function canDelete(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }
}
