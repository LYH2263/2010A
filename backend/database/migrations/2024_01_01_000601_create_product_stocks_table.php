<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_sku_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('stock')->default(0)->comment('库存数量');
            $table->unsignedInteger('reserved_stock')->default(0)->comment('预留库存');
            $table->timestamps();

            $table->unique(['product_id', 'product_sku_id', 'warehouse_id']);
            $table->index(['warehouse_id', 'stock']);
            $table->index(['product_id', 'warehouse_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_stocks');
    }
};
