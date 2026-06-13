<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique()->comment('券码');
            $table->string('name', 128)->comment('券名称');
            $table->enum('type', ['fixed', 'percent'])->comment('类型：fixed=满减，percent=折扣');
            $table->decimal('value', 10, 2)->comment('面额(元)或折扣率(0-100)');
            $table->decimal('min_amount', 10, 2)->default(0)->comment('使用门槛：满X元');
            $table->dateTime('valid_from')->comment('有效期开始');
            $table->dateTime('valid_until')->comment('有效期结束');
            $table->unsignedInteger('total_quantity')->default(1)->comment('发行总量');
            $table->unsignedInteger('used_quantity')->default(0)->comment('已用数量');
            $table->json('category_ids')->nullable()->comment('可用商品分类ID范围，null表示全部');
            $table->enum('status', ['active', 'inactive'])->default('active')->comment('状态：active=启用，inactive=停用');
            $table->text('description')->nullable()->comment('描述');
            $table->timestamps();

            $table->index(['status', 'valid_from', 'valid_until']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};
