<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Pagination\LengthAwarePaginator;

class CategoryService
{
    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return Category::orderBy('sort_order')->orderBy('id')->paginate($perPage);
    }

    public function create(array $data): Category
    {
        $data['slug'] = $data['slug'] ?? \Illuminate\Support\Str::slug($data['name']);
        return Category::create($data);
    }

    public function update(Category $category, array $data): Category
    {
        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = \Illuminate\Support\Str::slug($data['name']);
        }
        $category->update($data);
        return $category;
    }

    public function delete(Category $category): void
    {
        if (Product::where('category_id', $category->id)->exists()) {
            throw new \InvalidArgumentException('该分类下存在商品，无法删除。请先将该分类下的商品移至其他分类或删除后再试。');
        }
        $category->delete();
    }

    public function allForSelect(): \Illuminate\Database\Eloquent\Collection
    {
        return Category::orderBy('sort_order')->orderBy('id')->get();
    }
}
