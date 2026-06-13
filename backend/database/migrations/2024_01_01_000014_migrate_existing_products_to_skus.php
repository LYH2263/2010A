<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $products = DB::table('products')->get();

        foreach ($products as $product) {
            $exists = DB::table('product_skus')
                ->where('product_id', $product->id)
                ->where('is_default', true)
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('product_skus')->insert([
                'product_id' => $product->id,
                'sku' => $product->sku,
                'price' => $product->price,
                'stock' => $product->stock,
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('product_skus')->where('is_default', true)->delete();
    }
};
