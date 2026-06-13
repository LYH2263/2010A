<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['name' => '数码电子', 'slug' => 'digital', 'sort_order' => 1],
            ['name' => '服装鞋包', 'slug' => 'clothing', 'sort_order' => 2],
            ['name' => '食品饮料', 'slug' => 'food', 'sort_order' => 3],
            ['name' => '家居生活', 'slug' => 'home', 'sort_order' => 4],
            ['name' => '美妆个护', 'slug' => 'beauty', 'sort_order' => 5],
            ['name' => '运动户外', 'slug' => 'sports', 'sort_order' => 6],
            ['name' => '图书文娱', 'slug' => 'books', 'sort_order' => 7],
            ['name' => '母婴用品', 'slug' => 'baby', 'sort_order' => 8],
            ['name' => '家用电器', 'slug' => 'appliances', 'sort_order' => 9],
            ['name' => '办公文具', 'slug' => 'office', 'sort_order' => 10],
        ];
        foreach ($items as $item) {
            Category::firstOrCreate(['slug' => $item['slug']], $item);
        }
    }
}
