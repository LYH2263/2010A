<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_sku_spec_value', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_sku_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_spec_value_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_spec_id')->constrained('product_specs')->cascadeOnDelete();

            $table->unique(['product_sku_id', 'product_spec_id']);
            $table->index(['product_sku_id']);
            $table->index(['product_spec_value_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_sku_spec_value');
    }
};
