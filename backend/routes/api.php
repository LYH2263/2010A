<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\InventoryController;
use Illuminate\Support\Facades\Route;

// 公开路由（无需认证）
Route::post('login', [AuthController::class, 'login']);
Route::post('logout', [AuthController::class, 'logout']);

// 需要认证的路由（Session 认证）
Route::middleware(['auth:web'])->group(function () {
    Route::get('me', [AuthController::class, 'me']);
    Route::get('/', [DashboardController::class, 'index']);
Route::get('products', [ProductController::class, 'index']);
Route::get('products/create', [ProductController::class, 'create']);
Route::post('products', [ProductController::class, 'store']);
Route::get('products/{id}', [ProductController::class, 'show']);
Route::get('products/{id}/edit', [ProductController::class, 'edit']);
Route::put('products/{id}', [ProductController::class, 'update']);
Route::delete('products/{id}', [ProductController::class, 'destroy']);

Route::get('categories', [CategoryController::class, 'index']);
Route::get('categories/create', [CategoryController::class, 'create']);
Route::post('categories', [CategoryController::class, 'store']);
Route::get('categories/{id}/edit', [CategoryController::class, 'edit']);
Route::put('categories/{id}', [CategoryController::class, 'update']);
Route::delete('categories/{id}', [CategoryController::class, 'destroy']);

Route::get('orders', [OrderController::class, 'index']);
Route::get('orders/create', [OrderController::class, 'create']);
Route::post('orders', [OrderController::class, 'store']);
Route::get('orders/{id}', [OrderController::class, 'show']);
Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus']);

Route::get('inventory', [InventoryController::class, 'index']);
Route::get('inventory/{product}/adjust', [InventoryController::class, 'adjust']);
Route::post('inventory/{product}/adjust', [InventoryController::class, 'doAdjust']);
});
