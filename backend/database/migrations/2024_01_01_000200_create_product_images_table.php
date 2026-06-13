<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('path', 512)->comment('存储相对路径');
            $table->string('url', 512)->comment('访问URL');
            $table->unsignedInteger('sort')->default(0)->comment('排序，升序');
            $table->boolean('is_main')->default(false)->comment('是否主图');
            $table->string('session_id', 128)->nullable()->index()->comment('未提交时的会话标识，用于临时清理');
            $table->timestamps();

            $table->index(['product_id', 'sort']);
            $table->index(['created_at', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
