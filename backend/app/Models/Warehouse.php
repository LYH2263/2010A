<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warehouse extends Model
{
    const STATUS_ACTIVE = 1;
    const STATUS_INACTIVE = 0;

    protected $fillable = [
        'name', 'code', 'address', 'status', 'is_default'
    ];

    protected $casts = [
        'status' => 'integer',
        'is_default' => 'boolean',
    ];

    public function productStocks(): HasMany
    {
        return $this->hasMany(ProductStock::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    public static function getDefaultWarehouse(): ?self
    {
        return self::default()->first();
    }

    public static function getDefaultWarehouseId(): ?int
    {
        $warehouse = self::getDefaultWarehouse();
        return $warehouse?->id;
    }

    public static function ensureDefaultWarehouse(): self
    {
        $warehouse = self::default()->first();
        if ($warehouse) {
            return $warehouse;
        }

        return self::create([
            'name' => '默认仓库',
            'code' => 'DEFAULT',
            'address' => '系统默认仓库',
            'status' => self::STATUS_ACTIVE,
            'is_default' => true,
        ]);
    }
}
