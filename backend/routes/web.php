<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\InventoryController;
use Illuminate\Support\Facades\Route;

Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

Route::resource('products', ProductController::class);
Route::resource('categories', CategoryController::class)->except(['show']);

Route::resource('orders', OrderController::class)->except(['edit', 'update']);
Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus'])->name('orders.updateStatus');

Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
Route::get('inventory/{product}/adjust', [InventoryController::class, 'adjust'])->name('inventory.adjust');
Route::post('inventory/{product}/adjust', [InventoryController::class, 'doAdjust'])->name('inventory.doAdjust');
