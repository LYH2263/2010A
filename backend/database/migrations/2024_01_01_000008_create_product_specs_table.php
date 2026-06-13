<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_specs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name', 64)->comment('规格名称，如颜色、尺寸');
            $table->unsignedInteger('sort')->default(0)->comment('排序');
            $table->timestamps();

            $table->index(['product_id', 'sort']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_specs');
    }
};
