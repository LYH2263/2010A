<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Refund;
use App\Http\Requests\RefundRequest;
use App\Services\RefundService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class RefundController extends Controller
{
    public function __construct(
        private RefundService $refundService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $status = $request->query('status');
        $orderId = $request->query('order_id');
        if ($status !== null && $status !== '') {
            $status = in_array($status, [Refund::STATUS_PENDING, Refund::STATUS_APPROVED, Refund::STATUS_REJECTED, Refund::STATUS_COMPLETED], true) ? $status : null;
        }
        if ($orderId !== null && $orderId !== '') {
            $orderId = (int) $orderId;
        } else {
            $orderId = null;
        }
        $refunds = $this->refundService->list($perPage, $status ?? null, $orderId);
        $payload = $refunds->toArray();
        $payload['refund_counts'] = Refund::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();
        return response()->json($payload);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $refund = $this->refundService->find($id);
        if (!$refund) {
            return response()->json(['message' => '退款单不存在'], 404);
        }
        return response()->json($refund);
    }

    public function store(RefundRequest $request, int $orderId): JsonResponse
    {
        try {
            $order = Order::find($orderId);
            if (!$order) {
                return response()->json(['message' => '订单不存在'], 404);
            }
            $refund = $this->refundService->create($order, $request->validated());
            return response()->json($refund, 201);
        } catch (\Throwable $e) {
            Log::error('RefundController@store', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function approve(Request $request, Refund $refund): JsonResponse
    {
        try {
            $auditRemark = $request->input('audit_remark', '');
            $refund = $this->refundService->approve($refund, is_string($auditRemark) ? $auditRemark : '');
            return response()->json($refund);
        } catch (\Throwable $e) {
            Log::error('RefundController@approve', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function reject(Request $request, Refund $refund): JsonResponse
    {
        try {
            $auditRemark = $request->input('audit_remark', '');
            if (!is_string($auditRemark) || trim($auditRemark) === '') {
                return response()->json(['message' => '请填写拒绝原因'], 422);
            }
            $refund = $this->refundService->reject($refund, $auditRemark);
            return response()->json($refund);
        } catch (\Throwable $e) {
            Log::error('RefundController@reject', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
