<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_spec_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_spec_id')->constrained()->cascadeOnDelete();
            $table->string('value', 64)->comment('规格值，如红色、M码');
            $table->unsignedInteger('sort')->default(0)->comment('排序');
            $table->timestamps();

            $table->index(['product_spec_id', 'sort']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_spec_values');
    }
};
