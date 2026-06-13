<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_skus', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('sku', 64)->unique()->comment('SKU 编码');
            $table->decimal('price', 10, 2)->comment('价格');
            $table->unsignedInteger('stock')->default(0)->comment('库存');
            $table->boolean('is_default')->default(false)->comment('是否默认 SKU');
            $table->timestamps();

            $table->index(['product_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_skus');
    }
};
