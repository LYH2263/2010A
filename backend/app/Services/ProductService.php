<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductSku;
use App\Models\ProductSpec;
use App\Models\ProductSpecValue;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ProductService
{
    /**
     * @param array{filters?: array{keyword?: string}} $options
     */
    public function list(?int $categoryId = null, int $perPage = 15, array $options = []): LengthAwarePaginator
    {
        $q = Product::with(['category', 'skus.specValues.spec'])->orderBy('id', 'desc');
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
     *   skus?: array<int, array{sku: string, price: string|float, stock: int, spec_values?: array<int, int>}>
     * } $data
     */
    public function create(array $data): Product
    {
        return DB::transaction(function () use ($data) {
            $hasSpecs = !empty($data['specs']) && !empty($data['skus']);

            $product = Product::create([
                'category_id' => $data['category_id'] ?? null,
                'name' => $data['name'],
                'sku' => $data['sku'],
                'description' => $data['description'] ?? null,
                'price' => $data['price'],
                'stock' => $data['stock'] ?? 0,
                'status' => $data['status'] ?? 1,
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
                ]);
            }

            return $product->load(['skus.specValues.spec', 'specs.values']);
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
     *   skus?: array<int, array{id?: int, sku: string, price: string|float, stock: int, spec_values?: array<int, int>}>
     * } $data
     */
    public function update(Product $product, array $data): Product
    {
        return DB::transaction(function () use ($product, $data) {
            $hasSpecs = isset($data['specs']) && isset($data['skus']);

            $product->update([
                'category_id' => $data['category_id'] ?? $product->category_id,
                'name' => $data['name'],
                'sku' => $data['sku'],
                'description' => $data['description'] ?? $product->description,
                'price' => $data['price'],
                'stock' => $data['stock'] ?? $product->stock,
                'status' => $data['status'] ?? $product->status,
            ]);

            if ($hasSpecs) {
                $product->specs()->delete();
                $product->skus()->delete();
                $this->syncSpecsAndSkus($product, $data['specs'], $data['skus']);
            } else {
                $defaultSku = $product->defaultSku;
                if ($defaultSku) {
                    $defaultSku->update([
                        'sku' => $product->sku,
                        'price' => $product->price,
                        'stock' => $product->stock,
                    ]);
                } else {
                    ProductSku::create([
                        'product_id' => $product->id,
                        'sku' => $product->sku,
                        'price' => $product->price,
                        'stock' => $product->stock,
                        'is_default' => true,
                    ]);
                }
            }

            return $product->fresh()->load(['skus.specValues.spec', 'specs.values']);
        });
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
            $sku = ProductSku::create([
                'product_id' => $product->id,
                'sku' => $skuData['sku'],
                'price' => $skuData['price'],
                'stock' => (int) ($skuData['stock'] ?? 0),
                'is_default' => $isDefault,
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
        $product->delete();
    }

    public function find(int $id): ?Product
    {
        return Product::with(['category', 'skus.specValues.spec', 'specs.values'])->find($id);
    }

    public function onSaleProducts(): \Illuminate\Database\Eloquent\Collection
    {
        return Product::onSale()->with(['skus.specValues.spec', 'specs.values'])->orderBy('id')->get();
    }

    public function findSku(int $skuId): ?ProductSku
    {
        return ProductSku::with(['product', 'specValues.spec'])->find($skuId);
    }
}
