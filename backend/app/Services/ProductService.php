<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Pagination\LengthAwarePaginator;

class ProductService
{
    /**
     * @param array{filters?: array{keyword?: string}} $options
     */
    public function list(?int $categoryId = null, int $perPage = 15, array $options = []): LengthAwarePaginator
    {
        $q = Product::with('category')->orderBy('id', 'desc');
        if ($categoryId !== null) {
            $q->where('category_id', $categoryId);
        }
        $filters = $options['filters'] ?? [];
        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->where(function ($q) use ($kw) {
                $q->where('name', 'like', '%' . $kw . '%')->orWhere('sku', 'like', '%' . $kw . '%');
            });
        }
        return $q->paginate($perPage);
    }

    public function create(array $data): Product
    {
        return Product::create($data);
    }

    public function update(Product $product, array $data): Product
    {
        $product->update($data);
        return $product;
    }

    public function delete(Product $product): void
    {
        $product->delete();
    }

    public function find(int $id): ?Product
    {
        return Product::with('category')->find($id);
    }

    public function onSaleProducts(): \Illuminate\Database\Eloquent\Collection
    {
        return Product::onSale()->orderBy('id')->get();
    }
}
