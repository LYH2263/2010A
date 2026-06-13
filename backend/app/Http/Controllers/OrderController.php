<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Http\Requests\OrderRequest;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    public function __construct(
        private OrderService $orderService
    ) {}

    public function index(Request $request): JsonResponse|\Illuminate\View\View
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $status = $request->query('status');
        if ($status !== null && $status !== '') {
            $status = in_array($status, [Order::STATUS_PENDING, Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_CANCELLED, Order::STATUS_COMPLETED], true) ? $status : null;
        }
        $filters = [];
        $orderNo = $request->query('order_no');
        if (is_string($orderNo) && trim($orderNo) !== '') {
            $filters['order_no'] = trim($orderNo);
        }
        $dateFrom = $request->query('date_from');
        if (is_string($dateFrom) && trim($dateFrom) !== '') {
            $filters['date_from'] = trim($dateFrom);
        }
        $dateTo = $request->query('date_to');
        if (is_string($dateTo) && trim($dateTo) !== '') {
            $filters['date_to'] = trim($dateTo);
        }
        $orders = $this->orderService->list($perPage, $status ?? null, ['filters' => $filters]);
        if ($request->expectsJson()) {
            $payload = $orders->toArray();
            $payload['order_counts'] = Order::selectRaw('status, count(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray();
            return response()->json($payload);
        }
        return view('orders.index', ['orders' => $orders]);
    }

    public function create(Request $request): \Illuminate\View\View|JsonResponse
    {
        $products = (new \App\Services\ProductService())->onSaleProducts();
        if ($request->expectsJson()) {
            return response()->json(['products' => $products]);
        }
        return view('orders.create', ['products' => $products]);
    }

    public function store(OrderRequest $request): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        try {
            $order = $this->orderService->create($request->validated());
            if ($request->expectsJson()) {
                return response()->json($order->load('items', 'customer'), 201);
            }
            return redirect()->route('orders.show', $order)->with('success', '订单已创建');
        } catch (\Throwable $e) {
            Log::error('OrderController@store', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->withInput()->with('error', $e->getMessage());
        }
    }

    public function show(Request $request, int $id): JsonResponse|\Illuminate\View\View
    {
        $order = $this->orderService->find($id);
        if (!$order) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '订单不存在'], 404);
            }
            abort(404);
        }
        if ($request->expectsJson()) {
            return response()->json($order);
        }
        return view('orders.show', ['order' => $order]);
    }

    public function updateStatus(Request $request, \App\Models\Order $order): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $request->validate(['status' => 'required|in:pending,paid,shipped,cancelled,completed']);
        try {
            $this->orderService->updateStatus($order, $request->input('status'));
            if ($request->expectsJson()) {
                return response()->json($order->fresh()->load('items', 'customer'));
            }
            return redirect()->route('orders.show', $order)->with('success', '状态已更新');
        } catch (\Throwable $e) {
            Log::error('OrderController@updateStatus', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->with('error', $e->getMessage());
        }
    }
}
