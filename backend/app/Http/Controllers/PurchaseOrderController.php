<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseOrderRequest;
use App\Services\PurchaseOrderService;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PurchaseOrderController extends Controller
{
    public function __construct(
        private PurchaseOrderService $purchaseOrderService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $filters = [];

        $keyword = $request->query('keyword');
        if (is_string($keyword) && trim($keyword) !== '') {
            $filters['keyword'] = trim($keyword);
        }

        $supplierId = $request->query('supplier_id');
        if ($supplierId !== null && $supplierId !== '') {
            $filters['supplier_id'] = (int) $supplierId;
        }

        $status = $request->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = (int) $status;
        }

        $dateFrom = $request->query('date_from');
        if (is_string($dateFrom) && trim($dateFrom) !== '') {
            $filters['date_from'] = trim($dateFrom);
        }

        $dateTo = $request->query('date_to');
        if (is_string($dateTo) && trim($dateTo) !== '') {
            $filters['date_to'] = trim($dateTo);
        }

        $orders = $this->purchaseOrderService->list($perPage, ['filters' => $filters]);

        $orders->getCollection()->each(function ($o) {
            $o->setAppends(['status_label']);
        });

        return response()->json([
            'purchase_orders' => $orders,
            'status_labels' => PurchaseOrder::$statusLabels,
        ]);
    }

    public function create(Request $request): JsonResponse
    {
        $meta = $this->purchaseOrderService->getCreateMeta();
        return response()->json($meta);
    }

    public function store(PurchaseOrderRequest $request): JsonResponse
    {
        try {
            $action = $request->input('action', 'draft');
            if ($action === 'submit') {
                $order = $this->purchaseOrderService->createAndSubmit($request->validated());
            } else {
                $order = $this->purchaseOrderService->saveDraft($request->validated());
            }
            $order->setAppends(['status_label']);
            return response()->json($order, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('PurchaseOrderController@store', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => $e->getMessage() ?: '创建失败'], 500);
        }
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $order = $this->purchaseOrderService->detail($id);
        if (!$order) {
            return response()->json(['message' => '采购单不存在'], 404);
        }
        $order->setAppends(['status_label']);
        $order->items->each(function ($i) {
            if ($i->sku) {
                $i->sku->setAppends(['spec_text']);
            }
        });
        return response()->json($order);
    }

    public function edit(Request $request, int $id): JsonResponse
    {
        $order = $this->purchaseOrderService->detail($id);
        if (!$order) {
            return response()->json(['message' => '采购单不存在'], 404);
        }
        $meta = $this->purchaseOrderService->getCreateMeta();
        $order->setAppends(['status_label']);
        return response()->json([
            'purchase_order' => $order,
            ...$meta,
        ]);
    }

    public function update(PurchaseOrderRequest $request, int $id): JsonResponse
    {
        try {
            $order = PurchaseOrder::find($id);
            if (!$order) {
                return response()->json(['message' => '采购单不存在'], 404);
            }
            $order = $this->purchaseOrderService->update($order, $request->validated());
            $order->setAppends(['status_label']);
            return response()->json($order);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('PurchaseOrderController@update', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => $e->getMessage() ?: '更新失败'], 500);
        }
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $order = PurchaseOrder::find($id);
            if (!$order) {
                return response()->json(['message' => '采购单不存在'], 404);
            }
            $this->purchaseOrderService->delete($order);
            return response()->json(null, 204);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function submit(Request $request, int $id): JsonResponse
    {
        try {
            $order = PurchaseOrder::find($id);
            if (!$order) {
                return response()->json(['message' => '采购单不存在'], 404);
            }
            $order = $this->purchaseOrderService->submit($order);
            $order->setAppends(['status_label']);
            return response()->json($order);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('PurchaseOrderController@submit', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => $e->getMessage() ?: '提交失败'], 500);
        }
    }

    public function stockIn(Request $request, int $id): JsonResponse
    {
        try {
            $order = PurchaseOrder::find($id);
            if (!$order) {
                return response()->json(['message' => '采购单不存在'], 404);
            }
            $order = $this->purchaseOrderService->stockIn($order);
            $order->setAppends(['status_label']);
            return response()->json($order);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('PurchaseOrderController@stockIn', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => $e->getMessage() ?: '入库失败'], 500);
        }
    }
}
