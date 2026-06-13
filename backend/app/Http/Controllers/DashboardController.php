<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        try {
            $productCount = Product::count();
            $orderCount = Order::count();
            $totalStock = Product::sum('stock') ?? 0;
            $totalAmount = Order::whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED])->sum('total_amount') ?? 0;

            if ($request->expectsJson() || $request->is('api/*')) {
                $recentOrders = Order::with('items')->orderBy('id', 'desc')->limit(8)->get();
                $lowStockProducts = Product::where('stock', '<=', 10)->orderBy('stock')->limit(8)->get();

                // 订单状态分布（用于饼图）
                $orderCountsByStatus = Order::selectRaw('status, count(*) as count')
                    ->groupBy('status')
                    ->pluck('count', 'status')
                    ->toArray();

                // 近 7 日订单数与金额（用于折线/柱状图）
                $ordersByDate = Order::query()
                    ->where('created_at', '>=', now()->subDays(6)->startOfDay())
                    ->selectRaw('date(created_at) as date, count(*) as count, coalesce(sum(total_amount), 0) as amount')
                    ->groupBy('date')
                    ->orderBy('date')
                    ->get()
                    ->keyBy('date');
                $last7Days = collect(range(0, 6))->map(function ($i) {
                    return now()->subDays(6 - $i)->format('Y-m-d');
                });
                $chartOrdersByDate = $last7Days->map(function ($date) use ($ordersByDate) {
                    $row = $ordersByDate->get($date);
                    return [
                        'date' => \Carbon\Carbon::parse($date)->format('m-d'),
                        'count' => $row ? (int) $row->count : 0,
                        'amount' => $row ? round((float) $row->amount, 2) : 0,
                    ];
                })->values()->toArray();

                return response()->json([
                    'product_count' => $productCount,
                    'order_count' => $orderCount,
                    'total_stock' => (int) $totalStock,
                    'total_amount' => round((float) $totalAmount, 2),
                    'recent_orders' => $recentOrders,
                    'low_stock_products' => $lowStockProducts,
                    'order_counts_by_status' => $orderCountsByStatus,
                    'orders_by_date' => $chartOrdersByDate,
                ]);
            }

            return view('dashboard.index', compact('productCount', 'orderCount', 'totalStock', 'totalAmount'));
        } catch (\Exception $e) {
            Log::error('DashboardController@index', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => '服务器错误',
                    'message' => $e->getMessage(),
                ], 500);
            }
            throw $e;
        }
    }
}
