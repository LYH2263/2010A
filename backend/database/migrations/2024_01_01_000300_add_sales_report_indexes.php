<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'idx_orders_status_created_at');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->index(['order_id', 'product_id'], 'idx_order_items_order_product');
            $table->index('product_id', 'idx_order_items_product_id');
        });

        Schema::table('refunds', function (Blueprint $table) {
            $table->index(['status', 'order_id'], 'idx_refunds_status_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('idx_orders_status_created_at');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex('idx_order_items_order_product');
            $table->dropIndex('idx_order_items_product_id');
        });

        Schema::table('refunds', function (Blueprint $table) {
            $table->dropIndex('idx_refunds_status_order_id');
        });
    }
};
