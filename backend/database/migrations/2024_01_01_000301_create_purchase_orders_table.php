<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_no', 32)->unique()->comment('采购单号');
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->tinyInteger('status')->default(0)->comment('状态：0草稿 1已提交 2已入库');
            $table->decimal('total_amount', 12, 2)->default(0)->comment('采购总额');
            $table->text('remark')->nullable()->comment('备注');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable()->comment('提交时间');
            $table->timestamp('stocked_at')->nullable()->comment('入库时间');
            $table->timestamps();

            $table->index('supplier_id');
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
