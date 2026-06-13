<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $defaultWarehouse = DB::table('warehouses')->where('is_default', true)->first();

        if (!$defaultWarehouse) {
            $defaultWarehouseId = DB::table('warehouses')->insertGetId([
                'name' => '默认仓库',
                'code' => 'DEFAULT',
                'address' => '系统默认仓库',
                'status' => 1,
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $defaultWarehouseId = $defaultWarehouse->id;
        }

        $products = DB::table('products')->get();
        foreach ($products as $product) {
            $skus = DB::table('product_skus')->where('product_id', $product->id)->get();

            if ($skus->count() > 0) {
                foreach ($skus as $sku) {
                    $existing = DB::table('product_stocks')
                        ->where('product_id', $product->id)
                        ->where('product_sku_id', $sku->id)
                        ->where('warehouse_id', $defaultWarehouseId)
                        ->first();

                    if (!$existing) {
                        DB::table('product_stocks')->insert([
                            'product_id' => $product->id,
                            'product_sku_id' => $sku->id,
                            'warehouse_id' => $defaultWarehouseId,
                            'stock' => $sku->stock ?? 0,
                            'reserved_stock' => 0,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            } else {
                $existing = DB::table('product_stocks')
                    ->where('product_id', $product->id)
                    ->whereNull('product_sku_id')
                    ->where('warehouse_id', $defaultWarehouseId)
                    ->first();

                if (!$existing) {
                    DB::table('product_stocks')->insert([
                        'product_id' => $product->id,
                        'product_sku_id' => null,
                        'warehouse_id' => $defaultWarehouseId,
                        'stock' => $product->stock ?? 0,
                        'reserved_stock' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        DB::table('stock_movements')
            ->whereNull('warehouse_id')
            ->update(['warehouse_id' => $defaultWarehouseId]);
    }

    public function down(): void
    {
        $defaultWarehouse = DB::table('warehouses')->where('is_default', true)->first();
        if ($defaultWarehouse) {
            DB::table('product_stocks')->where('warehouse_id', $defaultWarehouse->id)->delete();
            DB::table('stock_movements')->where('warehouse_id', $defaultWarehouse->id)->update(['warehouse_id' => null]);
            DB::table('warehouses')->where('id', $defaultWarehouse->id)->delete();
        }
    }
};
