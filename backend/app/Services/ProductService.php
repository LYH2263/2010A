<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductSku;
use App\Models\ProductSpec;
use App\Models\ProductSpecValue;
use App\Models\StockMovement;
use App\Models\ProductStock;
use App\Models\Warehouse;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ProductService
{
    public function __construct(
        private ProductImageService $imageService,
        private InventoryService $inventoryService,
        private WarehouseService $warehouseService
    ) {}

    /**
     * @param array{filters?: array{keyword?: string}} $options
     */
    public function list(?int $categoryId = null, int $perPage = 15, array $options = []): LengthAwarePaginator
    {
        $q = Product::with(['category', 'skus.specValues.spec', 'mainImage'])->orderBy('id', 'desc');
        if ($categoryId !== null) {
            $q->where('category_id', $categoryId);
        }
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
        return $q->paginate($perPage);
    }

    /**
     * @param array{
     *   category_id?: int|null,
     *   name: string,
     *   sku: string,
     *   description?: string|null,
     *   price: string|float,
     *   stock?: int,
     *   status?: int,
     *   specs?: array<int, array{name: string, values: array<int, string>}>,
     *   skus?: array<int, array{sku: string, price: string|float, stock: int, spec_values?: array<int, int>}>,
     *   images?: array<int, array{id: int, is_main?: bool}>,
     * } $data
     */
    public function create(array $data, string $sessionId = ''): Product
    {
        return DB::transaction(function () use ($data, $sessionId) {
            $hasSpecs = !empty($data['specs']) && !empty($data['skus']);
            $initialStock = (int) ($data['stock'] ?? 0);

            $product = Product::create([
                'category_id' => $data['category_id'] ?? null,
                'name' => $data['name'],
                'sku' => $data['sku'],
                'description' => $data['description'] ?? null,
                'price' => $data['price'],
                'stock' => $initialStock,
                'status' => $data['status'] ?? 1,
                'alert_threshold' => isset($data['alert_threshold']) && $data['alert_threshold'] !== '' ? (int) $data['alert_threshold'] : null,
            ]);

            if ($hasSpecs) {
                $this->syncSpecsAndSkus($product, $data['specs'], $data['skus']);
            } else {
                ProductSku::create([
                    'product_id' => $product->id,
                    'sku' => $product->sku,
                    'price' => $product->price,
                    'stock' => $product->stock,
                    'is_default' => true,
                    'alert_threshold' => $product->alert_threshold,
                ]);
            }

            if (!empty($data['images']) && $sessionId) {
                $this->imageService->syncImages($product->id, $data['images'], $sessionId);
                $this->imageService->ensureMainImageUnique($product->id);
            }

            $this->initializeProductStocks($product);

            if ($hasSpecs && !empty($data['skus'])) {
                foreach ($product->skus as $sku) {
                    $skuData = collect($data['skus'])->firstWhere('sku', $sku->sku);
                    $skuStock = (int) ($skuData['stock'] ?? 0);
                    if ($skuStock > 0) {
                        $this->recordSkuStockMovementForCreate($sku, $skuStock, '新建商品初始化库存');
                    }
                }
            } elseif ($initialStock > 0) {
                $defaultSku = $product->defaultSku;
                if ($defaultSku) {
                    $this->recordSkuStockMovementForCreate($defaultSku, $initialStock, '新建商品初始化库存');
                } else {
                    $this->recordProductStockMovementForCreate($product, $initialStock, '新建商品初始化库存');
                }
            }

            return $product->load(['skus.specValues.spec', 'specs.values', 'images', 'warehouseStocks.warehouse']);
        });
    }

    /**
     * @param array{
     *   category_id?: int|null,
     *   name: string,
     *   sku: string,
     *   description?: string|null,
     *   price: string|float,
     *   stock?: int,
     *   status?: int,
     *   specs?: array<int, array{name: string, values: array<int, string>}>,
     *   skus?: array<int, array{id?: int, sku: string, price: string|float, stock: int, spec_values?: array<int, int>}>,
     *   images?: array<int, array{id: int, is_main?: bool}>,
     * } $data
     */
    public function update(Product $product, array $data, string $sessionId = ''): Product
    {
        return DB::transaction(function () use ($product, $data, $sessionId) {
            $hasSpecs = isset($data['specs']) && isset($data['skus']);
            $oldProductStock = $product->stock;
            $oldSkuStocks = [];
            foreach ($product->skus as $sku) {
                $oldSkuStocks[$sku->id] = $sku->stock;
            }

            $newStock = isset($data['stock']) ? (int) $data['stock'] : $oldProductStock;

            $product->update([
                'category_id' => $data['category_id'] ?? $product->category_id,
                'name' => $data['name'],
                'sku' => $data['sku'],
                'description' => $data['description'] ?? $product->description,
                'price' => $data['price'],
                'stock' => $newStock,
                'status' => $data['status'] ?? $product->status,
                'alert_threshold' => isset($data['alert_threshold']) && $data['alert_threshold'] !== '' ? (int) $data['alert_threshold'] : null,
            ]);

            if ($hasSpecs) {
                $product->specs()->delete();
                $product->skus()->delete();
                $this->syncSpecsAndSkus($product, $data['specs'], $data['skus']);

                foreach ($product->fresh()->skus as $sku) {
                    $skuData = collect($data['skus'])->firstWhere('sku', $sku->sku);
                    $newSkuStock = (int) ($skuData['stock'] ?? 0);
                    if ($newSkuStock > 0) {
                        $this->recordSkuStockMovementForCreate($sku, $newSkuStock, '编辑商品更新库存');
                    }
                }
            } else {
                $defaultSku = $product->defaultSku;
                if ($defaultSku) {
                    $oldSkuStock = $oldSkuStocks[$defaultSku->id] ?? $defaultSku->stock;
                    $defaultSku->update([
                        'sku' => $product->sku,
                        'price' => $product->price,
                        'stock' => $product->stock,
                        'alert_threshold' => $product->alert_threshold,
                    ]);

                    $skuDelta = $newStock - $oldSkuStock;
                    if ($skuDelta !== 0) {
                        $this->syncAndRecordSkuStockChange($defaultSku, $skuDelta, '编辑商品更新库存');
                    }
                } else {
                    $productDelta = $newStock - $oldProductStock;
                    if ($productDelta !== 0) {
                        $this->syncAndRecordProductStockChange($product, $productDelta, '编辑商品更新库存');
                    }

                    ProductSku::create([
                        'product_id' => $product->id,
                        'sku' => $product->sku,
                        'price' => $product->price,
                        'stock' => $product->stock,
                        'is_default' => true,
                        'alert_threshold' => $product->alert_threshold,
                    ]);
                }
            }

            if (isset($data['images']) && $sessionId) {
                $this->imageService->syncImages($product->id, $data['images'], $sessionId);
                $this->imageService->ensureMainImageUnique($product->id);
            }

            return $product->fresh()->load(['skus.specValues.spec', 'specs.values', 'images', 'warehouseStocks.warehouse']);
        });
    }

    protected function initializeProductStocks(Product $product): void
    {
        $warehouses = Warehouse::active()->get();
        foreach ($warehouses as $warehouse) {
            foreach ($product->skus as $sku) {
                ProductStock::firstOrCreate([
                    'product_id' => $product->id,
                    'product_sku_id' => $sku->id,
                    'warehouse_id' => $warehouse->id,
                ], [
                    'stock' => $sku->stock,
                    'reserved_stock' => 0,
                ]);
            }

            if ($product->skus->isEmpty()) {
                ProductStock::firstOrCreate([
                    'product_id' => $product->id,
                    'product_sku_id' => null,
                    'warehouse_id' => $warehouse->id,
                ], [
                    'stock' => $product->stock,
                    'reserved_stock' => 0,
                ]);
            }
        }
    }

    protected function recordSkuStockMovementForCreate(ProductSku $sku, int $stock, string $reason): void
    {
        $warehouses = Warehouse::active()->get();
        foreach ($warehouses as $warehouse) {
            $productStock = ProductStock::where('product_id', $sku->product_id)
                ->where('product_sku_id', $sku->id)
                ->where('warehouse_id', $warehouse->id)
                ->first();

            if ($productStock) {
                StockMovement::create([
                    'product_id' => $sku->product_id,
                    'product_sku_id' => $sku->id,
                    'warehouse_id' => $warehouse->id,
                    'source_type' => StockMovement::SOURCE_MANUAL_ADJUST,
                    'before_quantity' => 0,
                    'delta' => $productStock->stock,
                    'after_quantity' => $productStock->stock,
                    'operator_id' => auth()->check() ? auth()->id() : null,
                    'reason' => $reason,
                ]);
            }
        }
    }

    protected function recordProductStockMovementForCreate(Product $product, int $stock, string $reason): void
    {
        $warehouses = Warehouse::active()->get();
        foreach ($warehouses as $warehouse) {
            $productStock = ProductStock::where('product_id', $product->id)
                ->whereNull('product_sku_id')
                ->where('warehouse_id', $warehouse->id)
                ->first();

            if ($productStock) {
                StockMovement::create([
                    'product_id' => $product->id,
                    'product_sku_id' => null,
                    'warehouse_id' => $warehouse->id,
                    'source_type' => StockMovement::SOURCE_MANUAL_ADJUST,
                    'before_quantity' => 0,
                    'delta' => $productStock->stock,
                    'after_quantity' => $productStock->stock,
                    'operator_id' => auth()->check() ? auth()->id() : null,
                    'reason' => $reason,
                ]);
            }
        }
    }

    protected function syncAndRecordSkuStockChange(ProductSku $sku, int $delta, string $reason): void
    {
        $warehouses = Warehouse::active()->get();
        $defaultWarehouse = Warehouse::getDefaultWarehouse();

        foreach ($warehouses as $warehouse) {
            $productStock = ProductStock::where('product_id', $sku->product_id)
                ->where('product_sku_id', $sku->id)
                ->where('warehouse_id', $warehouse->id)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                $productStock = ProductStock::create([
                    'product_id' => $sku->product_id,
                    'product_sku_id' => $sku->id,
                    'warehouse_id' => $warehouse->id,
                    'stock' => 0,
                    'reserved_stock' => 0,
                ]);
            }

            if ($defaultWarehouse && $warehouse->id === $defaultWarehouse->id) {
                $beforeQty = $productStock->stock;
                $afterQty = $beforeQty + $delta;

                if ($afterQty < 0) {
                    throw new \InvalidArgumentException("【{$warehouse->name}】SKU 库存不足，当前：{$beforeQty}，无法扣减 " . abs($delta));
                }

                $productStock->update(['stock' => $afterQty]);

                $lastMovement = StockMovement::where('product_sku_id', $sku->id)
                    ->where('warehouse_id', $warehouse->id)
                    ->orderBy('id', 'desc')
                    ->lockForUpdate()
                    ->first();

                if ($lastMovement && $lastMovement->after_quantity !== $beforeQty) {
                    throw new \RuntimeException("SKU 库存流水结存不一致，预期：{$lastMovement->after_quantity}，实际：{$beforeQty}");
                }

                StockMovement::create([
                    'product_id' => $sku->product_id,
                    'product_sku_id' => $sku->id,
                    'warehouse_id' => $warehouse->id,
                    'source_type' => StockMovement::SOURCE_MANUAL_ADJUST,
                    'before_quantity' => $beforeQty,
                    'delta' => $delta,
                    'after_quantity' => $afterQty,
                    'operator_id' => auth()->check() ? auth()->id() : null,
                    'reason' => $reason,
                ]);
            } else {
                $productStock->update(['stock' => $productStock->stock + $delta]);
            }
        }

        $totalStock = (int) ProductStock::where('product_sku_id', $sku->id)->sum('stock');
        $sku->update(['stock' => $totalStock]);

        $product = Product::find($sku->product_id);
        if ($product) {
            $productTotalStock = (int) ProductStock::where('product_id', $product->id)->sum('stock');
            $product->update(['stock' => $productTotalStock]);
        }
    }

    protected function syncAndRecordProductStockChange(Product $product, int $delta, string $reason): void
    {
        $warehouses = Warehouse::active()->get();
        $defaultWarehouse = Warehouse::getDefaultWarehouse();

        foreach ($warehouses as $warehouse) {
            $productStock = ProductStock::where('product_id', $product->id)
                ->whereNull('product_sku_id')
                ->where('warehouse_id', $warehouse->id)
                ->lockForUpdate()
                ->first();

            if (!$productStock) {
                $productStock = ProductStock::create([
                    'product_id' => $product->id,
                    'product_sku_id' => null,
                    'warehouse_id' => $warehouse->id,
                    'stock' => 0,
                    'reserved_stock' => 0,
                ]);
            }

            if ($defaultWarehouse && $warehouse->id === $defaultWarehouse->id) {
                $beforeQty = $productStock->stock;
                $afterQty = $beforeQty + $delta;

                if ($afterQty < 0) {
                    throw new \InvalidArgumentException("【{$warehouse->name}】库存不足，当前：{$beforeQty}，无法扣减 " . abs($delta));
                }

                $productStock->update(['stock' => $afterQty]);

                $lastMovement = StockMovement::where('product_id', $product->id)
                    ->whereNull('product_sku_id')
                    ->where('warehouse_id', $warehouse->id)
                    ->orderBy('id', 'desc')
                    ->lockForUpdate()
                    ->first();

                if ($lastMovement && $lastMovement->after_quantity !== $beforeQty) {
                    throw new \RuntimeException("库存流水结存不一致，预期：{$lastMovement->after_quantity}，实际：{$beforeQty}");
                }

                StockMovement::create([
                    'product_id' => $product->id,
                    'product_sku_id' => null,
                    'warehouse_id' => $warehouse->id,
                    'source_type' => StockMovement::SOURCE_MANUAL_ADJUST,
                    'before_quantity' => $beforeQty,
                    'delta' => $delta,
                    'after_quantity' => $afterQty,
                    'operator_id' => auth()->check() ? auth()->id() : null,
                    'reason' => $reason,
                ]);
            } else {
                $productStock->update(['stock' => $productStock->stock + $delta]);
            }
        }

        $totalStock = (int) ProductStock::where('product_id', $product->id)->sum('stock');
        $product->update(['stock' => $totalStock]);
    }

    /**
     * 同步规格和 SKU
     *
     * @param Product $product
     * @param array<int, array{name: string, values: array<int, string>}> $specsData
     * @param array<int, array{sku: string, price: string|float, stock: int, spec_values?: array<int, mixed>}> $skusData
     */
    private function syncSpecsAndSkus(Product $product, array $specsData, array $skusData): void
    {
        $specValueMap = [];
        $specNameMap = [];

        foreach ($specsData as $sort => $specData) {
            $spec = ProductSpec::create([
                'product_id' => $product->id,
                'name' => $specData['name'],
                'sort' => $sort,
            ]);

            $specNameMap[$specData['name']] = $spec;

            foreach ($specData['values'] as $valSort => $value) {
                $specValue = ProductSpecValue::create([
                    'product_spec_id' => $spec->id,
                    'value' => $value,
                    'sort' => $valSort,
                ]);
                $specValueMap[$spec->id . '_' . $value] = $specValue->id;
            }
        }

        $skuIndex = 0;
        foreach ($skusData as $skuData) {
            $isDefault = $skuIndex === 0;
            $skuThreshold = isset($skuData['alert_threshold']) && $skuData['alert_threshold'] !== ''
                ? (int) $skuData['alert_threshold']
                : $product->alert_threshold;
            $sku = ProductSku::create([
                'product_id' => $product->id,
                'sku' => $skuData['sku'],
                'price' => $skuData['price'],
                'stock' => (int) ($skuData['stock'] ?? 0),
                'is_default' => $isDefault,
                'alert_threshold' => $skuThreshold,
            ]);

            if (!empty($skuData['spec_values'])) {
                foreach ($skuData['spec_values'] as $specName => $specValue) {
                    $spec = $specNameMap[$specName] ?? null;
                    if ($spec) {
                        $key = $spec->id . '_' . $specValue;
                        if (isset($specValueMap[$key])) {
                            $sku->specValues()->attach($specValueMap[$key], [
                                'product_spec_id' => $spec->id,
                            ]);
                        }
                    }
                }
            }
            $skuIndex++;
        }
    }

    public function delete(Product $product): void
    {
        DB::transaction(function () use ($product) {
            foreach ($product->images as $image) {
                $image->deleteFile();
            }
            $product->images()->delete();
            $product->delete();
        });
    }

    public function find(int $id): ?Product
    {
        return Product::with(['category', 'skus.specValues.spec', 'specs.values', 'images'])->find($id);
    }

    public function onSaleProducts(): \Illuminate\Database\Eloquent\Collection
    {
        return Product::onSale()->with(['skus.specValues.spec', 'specs.values', 'mainImage'])->orderBy('id')->get();
    }

    public function findSku(int $skuId): ?ProductSku
    {
        return ProductSku::with(['product', 'specValues.spec'])->find($skuId);
    }
}
