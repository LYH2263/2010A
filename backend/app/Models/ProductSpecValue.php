<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ProductSpecValue extends Model
{
    protected $fillable = [
        'product_spec_id', 'value', 'sort'
    ];

    protected $casts = [
        'sort' => 'integer',
    ];

    public function spec(): BelongsTo
    {
        return $this->belongsTo(ProductSpec::class, 'product_spec_id');
    }

    public function skus(): BelongsToMany
    {
        return $this->belongsToMany(
            ProductSku::class,
            'product_sku_spec_value',
            'product_spec_value_id',
            'product_sku_id'
        );
    }
}
