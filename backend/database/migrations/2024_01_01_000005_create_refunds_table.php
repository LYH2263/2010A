<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->string('refund_no', 32)->unique();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->decimal('refund_amount', 10, 2)->default(0);
            $table->string('status', 20)->default('pending');
            $table->text('reason')->nullable();
            $table->text('audit_remark')->nullable();
            $table->timestamp('audited_at')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
