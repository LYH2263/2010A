<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('refund_items', function (Blueprint $table) {
            $table->foreignId('product_sku_id')->nullable()->after('product_id')->constrained('product_skus')->nullOnDelete();
            $table->string('sku_code', 64)->nullable()->after('product_sku_id');
            $table->json('sku_specs')->nullable()->after('sku_code');

            $table->index('product_sku_id');
        });
    }

    public function down(): void
    {
        Schema::table('refund_items', function (Blueprint $table) {
            $table->dropForeign(['product_sku_id']);
            $table->dropColumn(['product_sku_id', 'sku_code', 'sku_specs']);
        });
    }
};
