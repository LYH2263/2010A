<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name', 128)->comment('仓库名称');
            $table->string('code', 64)->unique()->comment('仓库编码');
            $table->string('address', 255)->nullable()->comment('仓库地址');
            $table->tinyInteger('status')->default(1)->comment('状态：1启用 0禁用');
            $table->boolean('is_default')->default(false)->comment('是否默认仓库');
            $table->timestamps();

            $table->index(['status', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouses');
    }
};
