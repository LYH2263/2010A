<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\RefundController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\SalesReportController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\WarehouseController;
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

Route::get('refunds', [RefundController::class, 'index']);
Route::get('refunds/{id}', [RefundController::class, 'show']);
Route::post('orders/{orderId}/refunds', [RefundController::class, 'store']);
Route::post('refunds/{refund}/approve', [RefundController::class, 'approve']);
Route::post('refunds/{refund}/reject', [RefundController::class, 'reject']);

Route::get('inventory', [InventoryController::class, 'index']);
Route::get('inventory/movements', [InventoryController::class, 'movements']);
Route::get('inventory/{product}/adjust', [InventoryController::class, 'adjust']);
Route::post('inventory/{product}/adjust', [InventoryController::class, 'doAdjust']);

Route::get('coupons', [CouponController::class, 'index']);
Route::get('coupons/create', [CouponController::class, 'create']);
Route::post('coupons', [CouponController::class, 'store']);
Route::get('coupons/{id}/edit', [CouponController::class, 'edit']);
Route::put('coupons/{id}', [CouponController::class, 'update']);
Route::post('coupons/{id}/toggle', [CouponController::class, 'toggleStatus']);
Route::post('coupons/validate', [CouponController::class, 'validateCoupon']);

Route::get('product-images/config', [ProductImageController::class, 'config']);
Route::post('product-images/upload', [ProductImageController::class, 'upload']);
Route::delete('product-images/{id}', [ProductImageController::class, 'destroy']);

Route::get('sales-report', [SalesReportController::class, 'index']);
Route::get('sales-report/export', [SalesReportController::class, 'export']);

Route::get('suppliers/active', [SupplierController::class, 'allActive']);
Route::get('suppliers', [SupplierController::class, 'index']);
Route::get('suppliers/create', [SupplierController::class, 'create']);
Route::post('suppliers', [SupplierController::class, 'store']);
Route::get('suppliers/{id}', [SupplierController::class, 'show']);
Route::get('suppliers/{id}/edit', [SupplierController::class, 'edit']);
Route::put('suppliers/{id}', [SupplierController::class, 'update']);
Route::delete('suppliers/{id}', [SupplierController::class, 'destroy']);

Route::get('customers/search', [CustomerController::class, 'search']);
Route::get('customers', [CustomerController::class, 'index']);
Route::get('customers/create', [CustomerController::class, 'create']);
Route::post('customers', [CustomerController::class, 'store']);
Route::get('customers/{id}', [CustomerController::class, 'show']);
Route::get('customers/{id}/edit', [CustomerController::class, 'edit']);
Route::put('customers/{id}', [CustomerController::class, 'update']);
Route::delete('customers/{id}', [CustomerController::class, 'destroy']);

Route::get('purchase-orders', [PurchaseOrderController::class, 'index']);
Route::get('purchase-orders/create', [PurchaseOrderController::class, 'create']);
Route::post('purchase-orders', [PurchaseOrderController::class, 'store']);
Route::get('purchase-orders/{id}', [PurchaseOrderController::class, 'show']);
Route::get('purchase-orders/{id}/edit', [PurchaseOrderController::class, 'edit']);
Route::put('purchase-orders/{id}', [PurchaseOrderController::class, 'update']);
Route::delete('purchase-orders/{id}', [PurchaseOrderController::class, 'destroy']);
Route::post('purchase-orders/{id}/submit', [PurchaseOrderController::class, 'submit']);
Route::post('purchase-orders/{id}/stock-in', [PurchaseOrderController::class, 'stockIn']);

Route::get('notifications', [NotificationController::class, 'index']);
Route::get('notifications/summary', [NotificationController::class, 'summary']);
Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
Route::get('notifications/{id}', [NotificationController::class, 'show']);
Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);

Route::get('warehouses', [WarehouseController::class, 'index']);
Route::get('warehouses/active', [WarehouseController::class, 'allActive']);
Route::get('warehouses/create', [WarehouseController::class, 'create']);
Route::post('warehouses', [WarehouseController::class, 'store']);
Route::get('warehouses/{id}', [WarehouseController::class, 'show']);
Route::get('warehouses/{id}/edit', [WarehouseController::class, 'edit']);
Route::put('warehouses/{warehouse}', [WarehouseController::class, 'update']);
Route::delete('warehouses/{warehouse}', [WarehouseController::class, 'destroy']);
});
