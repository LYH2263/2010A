<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('source_type', 32)->comment('来源类型: manual_adjust, order_deduct, order_cancel, refund_restore');
            $table->integer('before_quantity')->comment('变化前数量');
            $table->integer('delta')->comment('变化值（正数增加，负数扣减）');
            $table->integer('after_quantity')->comment('变化后数量');
            $table->string('related_type', 32)->nullable()->comment('关联单据类型: order, refund');
            $table->unsignedBigInteger('related_id')->nullable()->comment('关联单据ID');
            $table->foreignId('operator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason', 255)->nullable()->comment('变动原因');
            $table->timestamps();

            $table->index(['product_id', 'created_at']);
            $table->index(['source_type', 'created_at']);
            $table->index(['related_type', 'related_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
