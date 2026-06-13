<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductSku;
use App\Models\StockMovement;
use App\Models\ProductStock;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class InventoryService
{
    public function __construct(
        private NotificationService $notificationService
    ) {}

    public function list(int $perPage = 15, array $options = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $q = Product::with(['category', 'skus.specValues.spec', 'warehouseStocks.warehouse'])->orderBy('id');
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

        if (!empty($filters['warehouse_id']) && $filters['warehouse_id'] !== '') {
            $warehouseId = (int) $filters['warehouse_id'];
            $q->whereHas('warehouseStocks', function ($subQ) use ($warehouseId) {
                $subQ->where('warehouse_id', $warehouseId);
            })->with(['warehouseStocks' => function ($subQ) use ($warehouseId) {
                $subQ->where('warehouse_id', $warehouseId);
            }]);
        }

        if (!empty($filters['low_stock'])) {
            $defaultThreshold = $this->notificationService->getDefaultThreshold();
            $warehouseId = $filters['warehouse_id'] ?? null;

            $q->where(function ($mainQ) use ($defaultThreshold, $warehouseId) {
                $mainQ->whereHas('warehouseStocks', function ($subQ) use ($defaultThreshold, $warehouseId) {
                    if ($warehouseId) {
                        $subQ->where('warehouse_id', $warehouseId);
                    }
                    $subQ->where(function ($stockQ) use ($defaultThreshold) {
                        $stockQ->whereHas('sku', function ($skuQ) use ($defaultThreshold) {
                            $skuQ->whereRaw('product_stocks.stock <= COALESCE(product_skus.alert_threshold, ?)', [$defaultThreshold]);
                        })->orWhere(function ($productStockQ) use ($defaultThreshold) {
                            $productStockQ->whereNull('product_sku_id')
                                ->whereHas('product', function ($productQ) use ($defaultThreshold) {
                                    $productQ->whereRaw('product_stocks.stock <= COALESCE(products.alert_threshold, ?)', [$defaultThreshold]);
                                });
                        });
                    });
                })->orWhere(function ($productQ) use ($defaultThreshold, $warehouseId) {
                    $productQ->whereDoesntHave('warehouseStocks', function ($subQ) use ($warehouseId) {
                        if ($warehouseId) {
                            $subQ->where('warehouse_id', $warehouseId);
                        }
                    })->where(function ($legacyQ) use ($defaultThreshold) {
                        $legacyQ->whereHas('skus', function ($subQ) use ($defaultThreshold) {
                            $subQ->whereRaw('stock <= COALESCE(alert_threshold, ?)', [$defaultThreshold]);
                        })->orWhere(function ($legacyProductQ) use ($defaultThreshold) {
                            $legacyProductQ->whereDoesntHave('skus')
                                ->whereRaw('stock <= COALESCE(alert_threshold, ?)', [$defaultThreshold]);
                        });
                    });
                });
            });
        }

        return $q->paginate($perPage);
    }

    public function changeStock(Product $product, int $delta, string $sourceType, array $context = []): Product
    {
        if ($delta === 0) {
            return $product;
        }

        $warehouseId = $context['warehouse_id'] ?? null;
        if ($warehouseId === null) {
            $warehouseId = Warehouse::getDefaultWarehouseId();
        }
        if (!$warehouseId) {
            throw new \InvalidArgumentException('未找到可用仓库');
        }

        $result = DB::transaction(function () use ($product, $delta, $sourceType, $context, $warehouseId) {
            $productStock = ProductStock::where('product_id', $product->id)
                ->whereNull('product_sku_id')
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                $productStock = ProductStock::create([
                    'product_id' => $product->id,
                    'product_sku_id' => null,
                    'warehouse_id' => $warehouseId,
                    'stock' => 0,
                    'reserved_stock' => 0,
                ]);
            }

            $beforeQty = $productStock->stock;
            $afterQty = $beforeQty + $delta;

            if ($afterQty < 0) {
                $warehouse = Warehouse::find($warehouseId);
                $warehouseName = $warehouse?->name ?? '未知仓库';
                throw new \InvalidArgumentException("【{$warehouseName}】库存不足，当前：{$beforeQty}，无法扣减 " . abs($delta));
            }

            $productStock->update(['stock' => $afterQty]);

            $product->update(['stock' => $this->getProductTotalStock($product)]);

            $lastMovement = StockMovement::where('product_id', $product->id)
                ->whereNull('product_sku_id')
                ->where('warehouse_id', $warehouseId)
                ->orderBy('id', 'desc')
                ->lockForUpdate()
                ->first();

            if ($lastMovement && $lastMovement->after_quantity !== $beforeQty) {
                throw new \RuntimeException("库存流水结存不一致，预期：{$lastMovement->after_quantity}，实际：{$beforeQty}");
            }

            StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouseId,
                'source_type' => $sourceType,
                'before_quantity' => $beforeQty,
                'delta' => $delta,
                'after_quantity' => $afterQty,
                'related_type' => $context['related_type'] ?? null,
                'related_id' => $context['related_id'] ?? null,
                'operator_id' => $context['operator_id'] ?? (Auth::check() ? Auth::id() : null),
                'reason' => $context['reason'] ?? null,
            ]);

            return ['product' => $product->fresh(), 'beforeQty' => $beforeQty, 'afterQty' => $afterQty, 'delta' => $delta];
        });

        if ($result['delta'] < 0) {
            $this->notificationService->checkAndCreateLowStockAlert($result['product']);
        }

        return $result['product'];
    }

    public function changeSkuStock(ProductSku $sku, int $delta, string $sourceType, array $context = []): ProductSku
    {
        if ($delta === 0) {
            return $sku;
        }

        $warehouseId = $context['warehouse_id'] ?? null;
        if ($warehouseId === null) {
            $warehouseId = Warehouse::getDefaultWarehouseId();
        }
        if (!$warehouseId) {
            throw new \InvalidArgumentException('未找到可用仓库');
        }

        $result = DB::transaction(function () use ($sku, $delta, $sourceType, $context, $warehouseId) {
            $productStock = ProductStock::where('product_id', $sku->product_id)
                ->where('product_sku_id', $sku->id)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                $productStock = ProductStock::create([
                    'product_id' => $sku->product_id,
                    'product_sku_id' => $sku->id,
                    'warehouse_id' => $warehouseId,
                    'stock' => 0,
                    'reserved_stock' => 0,
                ]);
            }

            $beforeQty = $productStock->stock;
            $afterQty = $beforeQty + $delta;

            if ($afterQty < 0) {
                $warehouse = Warehouse::find($warehouseId);
                $warehouseName = $warehouse?->name ?? '未知仓库';
                throw new \InvalidArgumentException("【{$warehouseName}】SKU 库存不足，当前：{$beforeQty}，无法扣减 " . abs($delta));
            }

            $productStock->update(['stock' => $afterQty]);

            $sku->update(['stock' => $this->getSkuTotalStock($sku)]);

            $product = Product::find($sku->product_id);
            $product?->update(['stock' => $this->getProductTotalStock($product)]);

            $lastMovement = StockMovement::where('product_sku_id', $sku->id)
                ->where('warehouse_id', $warehouseId)
                ->orderBy('id', 'desc')
                ->lockForUpdate()
                ->first();

            if ($lastMovement && $lastMovement->after_quantity !== $beforeQty) {
                throw new \RuntimeException("SKU 库存流水结存不一致，预期：{$lastMovement->after_quantity}，实际：{$beforeQty}");
            }

            StockMovement::create([
                'product_id' => $sku->product_id,
                'product_sku_id' => $sku->id,
                'warehouse_id' => $warehouseId,
                'source_type' => $sourceType,
                'before_quantity' => $beforeQty,
                'delta' => $delta,
                'after_quantity' => $afterQty,
                'related_type' => $context['related_type'] ?? null,
                'related_id' => $context['related_id'] ?? null,
                'operator_id' => $context['operator_id'] ?? (Auth::check() ? Auth::id() : null),
                'reason' => $context['reason'] ?? null,
            ]);

            $freshSku = $sku->fresh();

            return ['sku' => $freshSku, 'product' => $product, 'beforeQty' => $beforeQty, 'afterQty' => $afterQty, 'delta' => $delta];
        });

        if ($result['delta'] < 0 && $result['product']) {
            $this->notificationService->checkAndCreateLowStockAlert($result['product'], $result['sku']);
        }

        return $result['sku'];
    }

    public function adjust(Product $product, int $delta, ?string $reason = '', ?int $warehouseId = null): Product
    {
        return $this->changeStock($product, $delta, StockMovement::SOURCE_MANUAL_ADJUST, [
            'reason' => $reason,
            'warehouse_id' => $warehouseId,
        ]);
    }

    public function adjustSku(ProductSku $sku, int $delta, ?string $reason = '', ?int $warehouseId = null): ProductSku
    {
        return $this->changeSkuStock($sku, $delta, StockMovement::SOURCE_MANUAL_ADJUST, [
            'reason' => $reason,
            'warehouse_id' => $warehouseId,
        ]);
    }

    public function transferStock(ProductSku $sku, int $fromWarehouseId, int $toWarehouseId, int $quantity, ?string $reason = ''): void
    {
        if ($quantity <= 0) {
            throw new \InvalidArgumentException('调拨数量必须大于 0');
        }

        if ($fromWarehouseId === $toWarehouseId) {
            throw new \InvalidArgumentException('调出仓库和调入仓库不能相同');
        }

        DB::transaction(function () use ($sku, $fromWarehouseId, $toWarehouseId, $quantity, $reason) {
            $this->changeSkuStock($sku, -$quantity, StockMovement::SOURCE_MANUAL_ADJUST, [
                'warehouse_id' => $fromWarehouseId,
                'reason' => $reason ? "{$reason}（调出）" : '调拨出库',
            ]);

            $this->changeSkuStock($sku, $quantity, StockMovement::SOURCE_MANUAL_ADJUST, [
                'warehouse_id' => $toWarehouseId,
                'reason' => $reason ? "{$reason}（调入）" : '调拨入库',
            ]);
        });
    }

    public function listMovements(int $perPage = 15, array $options = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $q = StockMovement::with(['product', 'sku', 'operator', 'warehouse'])->orderBy('id', 'desc');
        $filters = $options['filters'] ?? [];

        if (!empty($filters['product_id']) && $filters['product_id'] !== '') {
            $q->where('product_id', (int) $filters['product_id']);
        }
        if (!empty($filters['product_sku_id']) && $filters['product_sku_id'] !== '') {
            $q->where('product_sku_id', (int) $filters['product_sku_id']);
        }
        if (!empty($filters['warehouse_id']) && $filters['warehouse_id'] !== '') {
            $q->where('warehouse_id', (int) $filters['warehouse_id']);
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

    public function stats(?int $warehouseId = null): array
    {
        $query = ProductStock::query();
        $valueQuery = DB::table('product_stocks as ps')
            ->leftJoin('product_skus as sku', 'ps.product_sku_id', '=', 'sku.id')
            ->leftJoin('products as p', 'ps.product_id', '=', 'p.id');

        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
            $valueQuery->where('ps.warehouse_id', $warehouseId);
        }

        $totalStock = $query->sum('stock');
        $totalValue = $valueQuery->selectRaw('SUM(COALESCE(sku.price, p.price) * ps.stock) as v')->value('v') ?? 0;
        $defaultThreshold = $this->notificationService->getDefaultThreshold();

        $lowStockQuery = ProductStock::query();
        if ($warehouseId) {
            $lowStockQuery->where('warehouse_id', $warehouseId);
        }

        $lowStockCount = $lowStockQuery->where(function ($q) use ($defaultThreshold) {
            $q->whereHas('sku', function ($subQ) use ($defaultThreshold) {
                $subQ->whereRaw('product_stocks.stock <= COALESCE(product_skus.alert_threshold, ?)', [$defaultThreshold]);
            })->orWhere(function ($productStockQ) use ($defaultThreshold) {
                $productStockQ->whereNull('product_sku_id')
                    ->whereHas('product', function ($productQ) use ($defaultThreshold) {
                        $productQ->whereRaw('product_stocks.stock <= COALESCE(products.alert_threshold, ?)', [$defaultThreshold]);
                    });
            });
        })->distinct('product_id')->count('product_id');

        return [
            'total_stock' => (int) $totalStock,
            'total_value' => round((float) $totalValue, 2),
            'low_stock_count' => $lowStockCount,
            'default_alert_threshold' => $defaultThreshold,
        ];
    }

    protected function getProductTotalStock(Product $product): int
    {
        return (int) ProductStock::where('product_id', $product->id)->sum('stock');
    }

    protected function getSkuTotalStock(ProductSku $sku): int
    {
        return (int) ProductStock::where('product_sku_id', $sku->id)->sum('stock');
    }

    public function getProductWarehouseStocks(Product $product): array
    {
        return ProductStock::with('warehouse')
            ->where('product_id', $product->id)
            ->get()
            ->groupBy('warehouse_id')
            ->map(function ($stocks, $warehouseId) {
                $warehouse = $stocks->first()->warehouse;
                return [
                    'warehouse_id' => $warehouseId,
                    'warehouse_name' => $warehouse?->name ?? '',
                    'warehouse_code' => $warehouse?->code ?? '',
                    'total_stock' => $stocks->sum('stock'),
                    'skus' => $stocks->whereNotNull('product_sku_id')->mapWithKeys(function ($s) {
                        return [$s->product_sku_id => $s->stock];
                    }),
                    'product_stock' => $stocks->whereNull('product_sku_id')->first()?->stock ?? 0,
                ];
            })
            ->values()
            ->toArray();
    }
}
