<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignId('product_sku_id')->nullable()->after('product_id')->constrained()->nullOnDelete();
            $table->string('sku_code', 64)->nullable()->after('product_name')->comment('下单时的 SKU 编码快照');
            $table->json('sku_specs')->nullable()->after('sku_code')->comment('下单时的规格快照');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['product_sku_id']);
            $table->dropColumn(['product_sku_id', 'sku_code', 'sku_specs']);
        });
    }
};
