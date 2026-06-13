<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    /**
     * @param array{filters?: array{keyword?: string, category_id?: int, low_stock?: bool}} $options
     */
    public function list(int $perPage = 15, array $options = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $q = Product::with('category')->orderBy('id');
        $filters = $options['filters'] ?? [];
        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->where(function ($q) use ($kw) {
                $q->where('name', 'like', '%' . $kw . '%')->orWhere('sku', 'like', '%' . $kw . '%');
            });
        }
        if (isset($filters['category_id']) && $filters['category_id'] !== '' && $filters['category_id'] !== null) {
            $q->where('category_id', (int) $filters['category_id']);
        }
        if (!empty($filters['low_stock'])) {
            $q->where('stock', '<=', 10);
        }
        return $q->paginate($perPage);
    }

    public function adjust(Product $product, int $delta, ?string $reason = ''): Product
    {
        return DB::transaction(function () use ($product, $delta) {
            $p = Product::where('id', $product->id)->lockForUpdate()->first();
            $newStock = $p->stock + $delta;
            if ($newStock < 0) {
                throw new \InvalidArgumentException("库存不足，当前：{$p->stock}，无法扣减 " . abs($delta));
            }
            $p->update(['stock' => $newStock]);
            return $p->fresh();
        });
    }

    public function stats(): array
    {
        $totalStock = Product::sum('stock');
        $totalValue = DB::table('products')->selectRaw('SUM(price * stock) as v')->value('v') ?? 0;
        $lowStockCount = Product::where('stock', '<=', 10)->count();
        return [
            'total_stock' => (int) $totalStock,
            'total_value' => round((float) $totalValue, 2),
            'low_stock_count' => $lowStockCount,
        ];
    }
}
