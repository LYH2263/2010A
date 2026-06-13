<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductSku;
use App\Models\ProductStock;
use App\Models\Refund;
use App\Models\Warehouse;
use App\Services\NotificationService;
use App\Services\WarehouseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
    ) {}

    public function index(Request $request)
    {
        try {
            $productCount = Product::count();
            $orderCount = Order::count();
            $totalStock = ProductStock::sum('stock') ?? 0;
            $defaultThreshold = $this->notificationService->getDefaultThreshold();
            $warehouseService = new WarehouseService($this->notificationService);
            $warehouses = $warehouseService->allActive();
            $warehouseStats = [];
            foreach ($warehouses as $w) {
                $warehouseStats[] = $warehouseService->stats($w->id);
            }
            $totalValue = DB::table('product_stocks as ps')
                ->leftJoin('product_skus as sku', 'ps.product_sku_id', 'sku.id')
                ->leftJoin('products as p', 'ps.product_id', 'p.id')
                ->selectRaw('SUM(COALESCE(sku.price, p.price) * ps.stock) as v')
                ->value('v') ?? 0;

            $paidOrders = Order::whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])->get();
            $totalAmount = '0.00';
            foreach ($paidOrders as $order) {
                $orderRefunded = $order->total_refunded_amount;
                $net = bcsub((string) $order->total_amount, (string) $orderRefunded, 2);
                if (bccomp($net, '0.00', 2) > 0) {
                    $totalAmount = bcadd($totalAmount, $net, 2);
                }
            }

            if ($request->expectsJson() || $request->is('api/*')) {
                $recentOrders = Order::with('items')->orderBy('id', 'desc')->limit(8)->get();
                $recentOrders->each(function ($o) {
                    $o->setAppends(['refund_status', 'total_refunded_amount']);
                });
                $lowStockProducts = Product::with(['skus', 'warehouseStocks.warehouse'])
                    ->where(function ($mainQ) use ($defaultThreshold) {
                        $mainQ->whereHas('warehouseStocks', function ($q) use ($defaultThreshold) {
                            $q->where(function ($stockQ) use ($defaultThreshold) {
                                $stockQ->whereHas('sku', function ($skuQ) use ($defaultThreshold) {
                                    $skuQ->whereRaw('product_stocks.stock <= COALESCE(product_skus.alert_threshold, ?)', [$defaultThreshold]);
                                })->orWhere(function ($productStockQ) use ($defaultThreshold) {
                                    $productStockQ->whereNull('product_sku_id')
                                        ->whereHas('product', function ($productQ) use ($defaultThreshold) {
                                            $productQ->whereRaw('product_stocks.stock <= COALESCE(products.alert_threshold, ?)', [$defaultThreshold]);
                                        });
                                });
                            });
                        })->orWhere(function ($legacyQ) use ($defaultThreshold) {
                            $legacyQ->whereHas('skus', function ($q) use ($defaultThreshold) {
                                $q->whereRaw('stock <= COALESCE(alert_threshold, ?)', [$defaultThreshold]);
                            })->orWhere(function ($productQ) use ($defaultThreshold) {
                                $productQ->whereDoesntHave('skus')
                                    ->whereRaw('stock <= COALESCE(alert_threshold, ?)', [$defaultThreshold]);
                            });
                        });
                    })
                    ->orderBy('id')
                    ->limit(8)
                    ->get();

                $orderCountsByStatus = Order::selectRaw('status, count(*) as count')
                    ->groupBy('status')
                    ->pluck('count', 'status')
                    ->toArray();

                $ordersByDate = Order::query()
                    ->where('created_at', '>=', now()->subDays(6)->startOfDay())
                    ->with('refunds')
                    ->get()
                    ->groupBy(function ($o) {
                        return $o->created_at->format('Y-m-d');
                    });
                $last7Days = collect(range(0, 6))->map(function ($i) {
                    return now()->subDays(6 - $i)->format('Y-m-d');
                });
                $chartOrdersByDate = $last7Days->map(function ($date) use ($ordersByDate) {
                    $rows = $ordersByDate->get($date, collect());
                    $count = $rows->count();
                    $amount = '0.00';
                    foreach ($rows as $o) {
                        if (in_array($o->status, [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED], true)) {
                            $net = bcsub((string) $o->total_amount, (string) $o->total_refunded_amount, 2);
                            if (bccomp($net, '0.00', 2) > 0) {
                                $amount = bcadd($amount, $net, 2);
                            }
                        }
                    }
                    return [
                        'date' => \Carbon\Carbon::parse($date)->format('m-d'),
                        'count' => $count,
                        'amount' => round((float) $amount, 2),
                    ];
                })->values()->toArray();

                return response()->json([
                    'product_count' => $productCount,
                    'order_count' => $orderCount,
                    'total_stock' => (int) $totalStock,
                    'total_value' => round((float) $totalValue, 2),
                    'total_amount' => round((float) $totalAmount, 2),
                    'recent_orders' => $recentOrders,
                    'low_stock_products' => $lowStockProducts,
                    'order_counts_by_status' => $orderCountsByStatus,
                    'orders_by_date' => $chartOrdersByDate,
                    'default_alert_threshold' => $defaultThreshold,
                    'unread_notification_count' => $this->notificationService->unreadCount(),
                    'warehouses' => $warehouses,
                    'warehouse_stats' => $warehouseStats,
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
