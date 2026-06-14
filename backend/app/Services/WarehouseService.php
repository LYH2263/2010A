<?php

namespace App\Services;

use App\Models\Warehouse;
use App\Models\ProductStock;
use App\Models\ProductSku;
use Illuminate\Support\Facades\DB;

class WarehouseService
{
    public function __construct(
        private NotificationService $notificationService
    ) {}

    public function list(int $perPage = 15, array $options = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $q = Warehouse::orderBy('is_default', 'desc')->orderBy('id');
        $filters = $options['filters'] ?? [];

        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->where(function ($subQ) use ($kw) {
                $subQ->where('name', 'like', '%' . $kw . '%')
                    ->orWhere('code', 'like', '%' . $kw . '%')
                    ->orWhere('address', 'like', '%' . $kw . '%');
            });
        }

        if (isset($filters['status']) && $filters['status'] !== '' && $filters['status'] !== null) {
            $q->where('status', (int) $filters['status']);
        }

        return $q->paginate($perPage);
    }

    public function allActive(): \Illuminate\Database\Eloquent\Collection
    {
        return Warehouse::active()->orderBy('is_default', 'desc')->orderBy('id')->get();
    }

    public function allForSelect(): array
    {
        return $this->allActive()->map(function ($w) {
            return [
                'id' => $w->id,
                'name' => $w->name,
                'code' => $w->code,
                'is_default' => $w->is_default,
            ];
        })->toArray();
    }

    public function create(array $data): Warehouse
    {
        return DB::transaction(function () use ($data) {
            if (!empty($data['is_default'])) {
                DB::table('warehouses')->where('is_default', true)->update(['is_default' => false]);
            }

            $warehouse = Warehouse::create([
                'name' => $data['name'],
                'code' => $data['code'],
                'address' => $data['address'] ?? null,
                'status' => $data['status'] ?? Warehouse::STATUS_ACTIVE,
                'is_default' => $data['is_default'] ?? false,
            ]);

            $this->initializeWarehouseStocks($warehouse);

            return $warehouse;
        });
    }

    public function update(Warehouse $warehouse, array $data): Warehouse
    {
        return DB::transaction(function () use ($warehouse, $data) {
            if (!empty($data['is_default']) && !$warehouse->is_default) {
                DB::table('warehouses')->where('is_default', true)->update(['is_default' => false]);
            }

            $warehouse->update([
                'name' => $data['name'],
                'code' => $data['code'],
                'address' => $data['address'] ?? $warehouse->address,
                'status' => $data['status'] ?? $warehouse->status,
                'is_default' => $data['is_default'] ?? $warehouse->is_default,
            ]);

            return $warehouse;
        });
    }

    public function delete(Warehouse $warehouse): void
    {
        if ($warehouse->is_default) {
            throw new \InvalidArgumentException('默认仓库不能删除');
        }

        $stockCount = ProductStock::where('warehouse_id', $warehouse->id)->sum('stock');
        if ($stockCount > 0) {
            throw new \InvalidArgumentException('仓库还有库存，无法删除，请先处理库存');
        }

        DB::transaction(function () use ($warehouse) {
            ProductStock::where('warehouse_id', $warehouse->id)->delete();
            DB::table('stock_movements')->where('warehouse_id', $warehouse->id)->update(['warehouse_id' => null]);
            $warehouse->delete();
        });
    }

    public function find(int $id): ?Warehouse
    {
        return Warehouse::find($id);
    }

    public function stats(int $warehouseId): array
    {
        $totalStock = ProductStock::where('warehouse_id', $warehouseId)->sum('stock');

        $totalValue = DB::table('product_stocks as ps')
            ->leftJoin('product_skus as sku', 'ps.product_sku_id', '=', 'sku.id')
            ->leftJoin('products as p', 'ps.product_id', '=', 'p.id')
            ->where('ps.warehouse_id', $warehouseId)
            ->selectRaw('SUM(COALESCE(sku.price, p.price) * ps.stock) as v')
            ->value('v') ?? 0;

        $defaultThreshold = $this->notificationService->getDefaultThreshold();

        $lowStockCount = ProductStock::where('warehouse_id', $warehouseId)
            ->where(function ($q) use ($defaultThreshold) {
                $q->whereHas('sku', function ($subQ) use ($defaultThreshold) {
                    $subQ->whereRaw('product_stocks.stock <= COALESCE(product_skus.alert_threshold, ?)', [$defaultThreshold]);
                })->orWhere(function ($subQ) use ($defaultThreshold) {
                    $subQ->whereNull('product_sku_id')
                        ->whereHas('product', function ($productQ) use ($defaultThreshold) {
                            $productQ->whereRaw('product_stocks.stock <= COALESCE(products.alert_threshold, ?)', [$defaultThreshold]);
                        });
                });
            })
            ->count();

        return [
            'warehouse_id' => $warehouseId,
            'total_stock' => (int) $totalStock,
            'total_value' => round((float) $totalValue, 2),
            'low_stock_count' => $lowStockCount,
        ];
    }

    protected function initializeWarehouseStocks(Warehouse $warehouse): void
    {
        $skus = ProductSku::with('product')->get();

        foreach ($skus as $sku) {
            ProductStock::firstOrCreate([
                'product_id' => $sku->product_id,
                'product_sku_id' => $sku->id,
                'warehouse_id' => $warehouse->id,
            ], [
                'stock' => 0,
                'reserved_stock' => 0,
            ]);
        }
    }
}
