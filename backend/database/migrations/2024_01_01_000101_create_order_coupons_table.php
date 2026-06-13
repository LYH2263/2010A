<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_coupons', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id')->comment('订单ID');
            $table->unsignedBigInteger('coupon_id')->comment('优惠券ID');
            $table->string('coupon_code', 64)->comment('券码快照');
            $table->string('coupon_name', 128)->comment('券名称快照');
            $table->enum('coupon_type', ['fixed', 'percent'])->comment('券类型快照');
            $table->decimal('coupon_value', 10, 2)->comment('券面额/折扣率快照');
            $table->decimal('discount_amount', 10, 2)->comment('实际优惠金额');
            $table->enum('status', ['used', 'released', 'partial_released'])->default('used')->comment('使用状态');
            $table->decimal('released_amount', 10, 2)->default(0)->comment('已释放优惠金额(部分退款场景)');
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('coupon_id')->references('id')->on('coupons')->onDelete('restrict');
            $table->unique(['order_id', 'coupon_id']);
            $table->index('coupon_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_coupons');
    }
};
