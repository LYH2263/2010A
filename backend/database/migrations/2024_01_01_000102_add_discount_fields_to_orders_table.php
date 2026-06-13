<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('original_amount', 10, 2)->default(0)->after('total_amount')->comment('优惠前金额(明细小计累加)');
            $table->decimal('discount_amount', 10, 2)->default(0)->after('original_amount')->comment('优惠金额');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['original_amount', 'discount_amount']);
        });
    }
};
