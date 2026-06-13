<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductSku;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class InventoryService
{
    /**
     * @param array{filters?: array{keyword?: string, category_id?: int, low_stock?: bool}} $options
     */
    public function list(int $perPage = 15, array $options = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $q = Product::with(['category', 'skus.specValues.spec'])->orderBy('id');
        $filters = $options['filters'] ?? [];
        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->where(function ($q) use ($kw) {
                $q->where('name', 'like', '%' . $kw . '%')
                    ->orWhere('sku', 'like', '%' . $kw . '%')
                    ->orWhereHas('skus', function ($subQ) use ($kw) {
                        $subQ->where('sku', 'like', '%' . $kw . '%');
                    });
            });
        }
        if (isset($filters['category_id']) && $filters['category_id'] !== '' && $filters['category_id'] !== null) {
            $q->where('category_id', (int) $filters['category_id']);
        }
        if (!empty($filters['low_stock'])) {
            $q->whereHas('skus', function ($subQ) {
                $subQ->where('stock', '<=', 10);
            });
        }
        return $q->paginate($perPage);
    }

    /**
     * 统一的商品级库存变动方法，保证库存改动与流水写入在同一事务内
     *
     * @param Product $product
     * @param int $delta 变化值（正数增加，负数扣减）
     * @param string $sourceType 来源类型
     * @param array{related_type?: string, related_id?: int, reason?: string, operator_id?: int} $context
     * @return Product
     * @throws \InvalidArgumentException
     */
    public function changeStock(Product $product, int $delta, string $sourceType, array $context = []): Product
    {
        if ($delta === 0) {
            return $product;
        }

        return DB::transaction(function () use ($product, $delta, $sourceType, $context) {
            $p = Product::where('id', $product->id)->lockForUpdate()->first();
            if (!$p) {
                throw new \InvalidArgumentException('商品不存在');
            }

            $beforeQty = $p->stock;
            $afterQty = $beforeQty + $delta;

            if ($afterQty < 0) {
                throw new \InvalidArgumentException("库存不足，当前：{$beforeQty}，无法扣减 " . abs($delta));
            }

            $p->update(['stock' => $afterQty]);

            $lastMovement = StockMovement::where('product_id', $p->id)
                ->whereNull('product_sku_id')
                ->orderBy('id', 'desc')
                ->lockForUpdate()
                ->first();

            if ($lastMovement && $lastMovement->after_quantity !== $beforeQty) {
                throw new \RuntimeException("库存流水结存不一致，预期：{$lastMovement->after_quantity}，实际：{$beforeQty}");
            }

            StockMovement::create([
                'product_id' => $p->id,
                'source_type' => $sourceType,
                'before_quantity' => $beforeQty,
                'delta' => $delta,
                'after_quantity' => $afterQty,
                'related_type' => $context['related_type'] ?? null,
                'related_id' => $context['related_id'] ?? null,
                'operator_id' => $context['operator_id'] ?? (Auth::check() ? Auth::id() : null),
                'reason' => $context['reason'] ?? null,
            ]);

            return $p->fresh();
        });
    }

    /**
     * SKU 级库存变动方法
     *
     * @param ProductSku $sku
     * @param int $delta 变化值（正数增加，负数扣减）
     * @param string $sourceType 来源类型
     * @param array{related_type?: string, related_id?: int, reason?: string, operator_id?: int} $context
     * @return ProductSku
     * @throws \InvalidArgumentException
     */
    public function changeSkuStock(ProductSku $sku, int $delta, string $sourceType, array $context = []): ProductSku
    {
        if ($delta === 0) {
            return $sku;
        }

        return DB::transaction(function () use ($sku, $delta, $sourceType, $context) {
            $s = ProductSku::where('id', $sku->id)->lockForUpdate()->first();
            if (!$s) {
                throw new \InvalidArgumentException('SKU 不存在');
            }

            $beforeQty = $s->stock;
            $afterQty = $beforeQty + $delta;

            if ($afterQty < 0) {
                throw new \InvalidArgumentException("SKU 库存不足，当前：{$beforeQty}，无法扣减 " . abs($delta));
            }

            $s->update(['stock' => $afterQty]);

            $lastMovement = StockMovement::where('product_sku_id', $s->id)
                ->orderBy('id', 'desc')
                ->lockForUpdate()
                ->first();

            if ($lastMovement && $lastMovement->after_quantity !== $beforeQty) {
                throw new \RuntimeException("SKU 库存流水结存不一致，预期：{$lastMovement->after_quantity}，实际：{$beforeQty}");
            }

            StockMovement::create([
                'product_id' => $s->product_id,
                'product_sku_id' => $s->id,
                'source_type' => $sourceType,
                'before_quantity' => $beforeQty,
                'delta' => $delta,
                'after_quantity' => $afterQty,
                'related_type' => $context['related_type'] ?? null,
                'related_id' => $context['related_id'] ?? null,
                'operator_id' => $context['operator_id'] ?? (Auth::check() ? Auth::id() : null),
                'reason' => $context['reason'] ?? null,
            ]);

            return $s->fresh();
        });
    }

    public function adjust(Product $product, int $delta, ?string $reason = ''): Product
    {
        return $this->changeStock($product, $delta, StockMovement::SOURCE_MANUAL_ADJUST, [
            'reason' => $reason,
        ]);
    }

    public function adjustSku(ProductSku $sku, int $delta, ?string $reason = ''): ProductSku
    {
        return $this->changeSkuStock($sku, $delta, StockMovement::SOURCE_MANUAL_ADJUST, [
            'reason' => $reason,
        ]);
    }

    /**
     * @param array{filters?: array{product_id?: int, source_type?: string, date_from?: string, date_to?: string, keyword?: string}} $options
     */
    public function listMovements(int $perPage = 15, array $options = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $q = StockMovement::with(['product', 'sku', 'operator'])->orderBy('id', 'desc');
        $filters = $options['filters'] ?? [];

        if (!empty($filters['product_id']) && $filters['product_id'] !== '') {
            $q->where('product_id', (int) $filters['product_id']);
        }
        if (!empty($filters['product_sku_id']) && $filters['product_sku_id'] !== '') {
            $q->where('product_sku_id', (int) $filters['product_sku_id']);
        }
        if (!empty($filters['source_type']) && $filters['source_type'] !== '') {
            $q->where('source_type', $filters['source_type']);
        }
        if (!empty($filters['date_from'])) {
            $q->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $q->whereDate('created_at', '<=', $filters['date_to']);
        }
        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->whereHas('product', function ($subQ) use ($kw) {
                $subQ->where('name', 'like', '%' . $kw . '%')
                    ->orWhere('sku', 'like', '%' . $kw . '%');
            });
        }

        return $q->paginate($perPage);
    }

    public function stats(): array
    {
        $totalStock = ProductSku::sum('stock');
        $totalValue = DB::table('product_skus')->selectRaw('SUM(price * stock) as v')->value('v') ?? 0;
        $lowStockCount = Product::whereHas('skus', function ($q) {
            $q->where('stock', '<=', 10);
        })->count();

        return [
            'total_stock' => (int) $totalStock,
            'total_value' => round((float) $totalValue, 2),
            'low_stock_count' => $lowStockCount,
        ];
    }
}
