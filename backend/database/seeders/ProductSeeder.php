<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $categories = Category::all()->keyBy('slug');
        $products = [
            ['sku' => 'SKU001', 'name' => '无线蓝牙耳机', 'category' => 'digital', 'price' => 199.00, 'stock' => 50],
            ['sku' => 'SKU002', 'name' => '机械键盘', 'category' => 'digital', 'price' => 299.00, 'stock' => 30],
            ['sku' => 'SKU003', 'name' => '运动T恤', 'category' => 'clothing', 'price' => 89.00, 'stock' => 100],
            ['sku' => 'SKU004', 'name' => '休闲背包', 'category' => 'clothing', 'price' => 159.00, 'stock' => 45],
            ['sku' => 'SKU005', 'name' => '坚果礼盒', 'category' => 'food', 'price' => 128.00, 'stock' => 80],
            ['sku' => 'SKU006', 'name' => '保温杯', 'category' => 'home', 'price' => 79.00, 'stock' => 60],
            ['sku' => 'SKU007', 'name' => '移动电源', 'category' => 'digital', 'price' => 129.00, 'stock' => 5],
            ['sku' => 'SKU008', 'name' => 'USB-C 扩展坞', 'category' => 'digital', 'price' => 259.00, 'stock' => 8],
            ['sku' => 'SKU009', 'name' => '无线鼠标', 'category' => 'digital', 'price' => 79.00, 'stock' => 3],
            ['sku' => 'SKU010', 'name' => '显示器支架', 'category' => 'digital', 'price' => 189.00, 'stock' => 12],
            ['sku' => 'SKU011', 'name' => '夏季短袖衬衫', 'category' => 'clothing', 'price' => 159.00, 'stock' => 4],
            ['sku' => 'SKU012', 'name' => '牛仔裤', 'category' => 'clothing', 'price' => 199.00, 'stock' => 10],
            ['sku' => 'SKU013', 'name' => '帆布鞋', 'category' => 'clothing', 'price' => 229.00, 'stock' => 22],
            ['sku' => 'SKU014', 'name' => '羽绒服', 'category' => 'clothing', 'price' => 499.00, 'stock' => 35],
            ['sku' => 'SKU015', 'name' => '咖啡豆 500g', 'category' => 'food', 'price' => 68.00, 'stock' => 6],
            ['sku' => 'SKU016', 'name' => '有机燕麦片', 'category' => 'food', 'price' => 45.00, 'stock' => 55],
            ['sku' => 'SKU017', 'name' => '蜂蜜瓶装', 'category' => 'food', 'price' => 88.00, 'stock' => 7],
            ['sku' => 'SKU018', 'name' => '茶叶礼盒', 'category' => 'food', 'price' => 168.00, 'stock' => 40],
            ['sku' => 'SKU019', 'name' => '台灯', 'category' => 'home', 'price' => 149.00, 'stock' => 18],
            ['sku' => 'SKU020', 'name' => '收纳盒三件套', 'category' => 'home', 'price' => 59.00, 'stock' => 2],
            ['sku' => 'SKU021', 'name' => '香薰加湿器', 'category' => 'home', 'price' => 199.00, 'stock' => 25],
            ['sku' => 'SKU022', 'name' => '洗面奶', 'category' => 'beauty', 'price' => 69.00, 'stock' => 9],
            ['sku' => 'SKU023', 'name' => '保湿面霜', 'category' => 'beauty', 'price' => 128.00, 'stock' => 42],
            ['sku' => 'SKU024', 'name' => '瑜伽垫', 'category' => 'sports', 'price' => 89.00, 'stock' => 33],
            ['sku' => 'SKU025', 'name' => '跳绳', 'category' => 'sports', 'price' => 39.00, 'stock' => 1],
            ['sku' => 'SKU026', 'name' => '编程入门书', 'category' => 'books', 'price' => 79.00, 'stock' => 60],
            ['sku' => 'SKU027', 'name' => '笔记本 A5', 'category' => 'books', 'price' => 25.00, 'stock' => 120],
            ['sku' => 'SKU028', 'name' => '婴儿湿巾', 'category' => 'baby', 'price' => 35.00, 'stock' => 80],
            ['sku' => 'SKU029', 'name' => '小风扇', 'category' => 'appliances', 'price' => 59.00, 'stock' => 15],
            ['sku' => 'SKU030', 'name' => '签字笔 12 支装', 'category' => 'office', 'price' => 29.00, 'stock' => 200],
        ];
        foreach ($products as $p) {
            $cat = $categories->get($p['category']);
            Product::firstOrCreate(
                ['sku' => $p['sku']],
                [
                    'category_id' => $cat?->id,
                    'name' => $p['name'],
                    'price' => $p['price'],
                    'stock' => $p['stock'],
                    'status' => Product::STATUS_ACTIVE,
                ]
            );
        }
    }
}
