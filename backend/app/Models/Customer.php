<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    const STATUS_ACTIVE = 1;
    const STATUS_INACTIVE = 0;

    const LEVEL_NORMAL = 'normal';
    const LEVEL_SILVER = 'silver';
    const LEVEL_GOLD = 'gold';
    const LEVEL_DIAMOND = 'diamond';

    public static array $statusLabels = [
        self::STATUS_ACTIVE => '启用',
        self::STATUS_INACTIVE => '禁用',
    ];

    public static array $levelLabels = [
        self::LEVEL_NORMAL => '普通',
        self::LEVEL_SILVER => '银卡',
        self::LEVEL_GOLD => '金卡',
        self::LEVEL_DIAMOND => '钻石',
    ];

    protected $fillable = [
        'name',
        'phone',
        'email',
        'level',
        'remark',
        'total_spent',
        'total_orders',
        'status',
    ];

    protected $casts = [
        'total_spent' => 'decimal:2',
        'total_orders' => 'integer',
        'status' => 'integer',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function getStatusLabelAttribute(): string
    {
        return self::$statusLabels[$this->status] ?? '未知';
    }

    public function getLevelLabelAttribute(): string
    {
        return self::$levelLabels[$this->level] ?? $this->level;
    }
}
