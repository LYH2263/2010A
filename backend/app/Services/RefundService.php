<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Refund;
use App\Models\RefundItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class RefundService
{
    public function list(int $perPage = 15, ?string $status = null, ?int $orderId = null): LengthAwarePaginator
    {
        $q = Refund::with(['order', 'items'])->orderBy('id', 'desc');
        if ($status !== null && $status !== '') {
            $q->where('status', $status);
        }
        if ($orderId !== null) {
            $q->where('order_id', $orderId);
        }
        return $q->paginate($perPage);
    }

    public function find(int $id): ?Refund
    {
        return Refund::with(['order', 'items', 'order.items'])->find($id);
    }

    public function create(Order $order, array $data): Refund
    {
        return DB::transaction(function () use ($order, $data) {
            $lockedOrder = Order::with('items')->where('id', $order->id)->lockForUpdate()->first();
            if (!$lockedOrder) {
                throw new \InvalidArgumentException('订单不存在');
            }
            if (!$lockedOrder->canApplyRefund()) {
                throw new \InvalidArgumentException('当前订单状态不允许申请退款');
            }

            $items = $data['items'] ?? [];
            if (empty($items)) {
                throw new \InvalidArgumentException('请选择需要退款的商品');
            }

            $reason = trim($data['reason'] ?? '');
            if ($reason === '') {
                throw new \InvalidArgumentException('请填写退款原因');
            }

            $refundItems = [];
            $totalRefundAmount = '0.00';

            foreach ($items as $row) {
                $orderItemId = (int) ($row['order_item_id'] ?? 0);
                $qty = (int) ($row['quantity'] ?? 0);

                if ($qty <= 0) {
                    continue;
                }

                $orderItem = OrderItem::where('id', $orderItemId)
                    ->where('order_id', $lockedOrder->id)
                    ->lockForUpdate()
                    ->first();

                if (!$orderItem) {
                    throw new \InvalidArgumentException('订单明细不存在');
                }

                $alreadyRefundedQty = RefundItem::where('order_item_id', $orderItem->id)
                    ->whereHas('refund', function ($q) {
                        $q->whereIn('status', [Refund::STATUS_APPROVED, Refund::STATUS_COMPLETED, Refund::STATUS_PENDING]);
                    })
                    ->sum('quantity');

                $remainingQty = $orderItem->quantity - (int) $alreadyRefundedQty;
                if ($remainingQty <= 0) {
                    throw new \InvalidArgumentException("商品【{$orderItem->product_name}】已全部申请退款");
                }
                if ($qty > $remainingQty) {
                    throw new \InvalidArgumentException("商品【{$orderItem->product_name}】可退数量为 {$remainingQty}，申请数量超出");
                }

                $subtotal = bcmul((string) $orderItem->price, (string) $qty, 2);
                $totalRefundAmount = bcadd($totalRefundAmount, $subtotal, 2);

                $refundItems[] = [
                    'order_item_id' => $orderItem->id,
                    'product_id' => $orderItem->product_id,
                    'product_name' => $orderItem->product_name,
                    'price' => $orderItem->price,
                    'quantity' => $qty,
                    'subtotal' => $subtotal,
                ];
            }

            if (empty($refundItems)) {
                throw new \InvalidArgumentException('请选择有效的退款商品和数量');
            }

            $pendingExists = Refund::where('order_id', $lockedOrder->id)
                ->where('status', Refund::STATUS_PENDING)
                ->exists();
            if ($pendingExists) {
                throw new \InvalidArgumentException('该订单已有待审核的退款申请，请先处理');
            }

            $refundNo = 'REF' . date('YmdHis') . str_pad((string) random_int(1, 99), 2, '0', STR_PAD_LEFT);

            $refund = Refund::create([
                'refund_no' => $refundNo,
                'order_id' => $lockedOrder->id,
                'refund_amount' => $totalRefundAmount,
                'status' => Refund::STATUS_PENDING,
                'reason' => $reason,
            ]);

            foreach ($refundItems as $item) {
                $refund->items()->create($item);
            }

            return $refund->load('items', 'order');
        });
    }

    public function approve(Refund $refund, string $auditRemark = ''): Refund
    {
        return DB::transaction(function () use ($refund, $auditRemark) {
            $lockedRefund = Refund::with(['items', 'order'])->where('id', $refund->id)->lockForUpdate()->first();
            if (!$lockedRefund) {
                throw new \InvalidArgumentException('退款单不存在');
            }
            if ($lockedRefund->status !== Refund::STATUS_PENDING) {
                throw new \InvalidArgumentException('仅待审核的退款单可审核通过');
            }

            foreach ($lockedRefund->items as $refundItem) {
                $orderItem = OrderItem::where('id', $refundItem->order_item_id)->lockForUpdate()->first();
                if (!$orderItem) {
                    throw new \InvalidArgumentException('订单明细不存在');
                }

                $alreadyRefundedQty = RefundItem::where('order_item_id', $orderItem->id)
                    ->whereHas('refund', function ($q) {
                        $q->whereIn('status', [Refund::STATUS_APPROVED, Refund::STATUS_COMPLETED]);
                    })
                    ->where('refund_id', '!=', $lockedRefund->id)
                    ->sum('quantity');

                $remainingQty = $orderItem->quantity - (int) $alreadyRefundedQty;
                if ($refundItem->quantity > $remainingQty) {
                    throw new \InvalidArgumentException("商品【{$refundItem->product_name}】可退数量不足");
                }

                $product = Product::where('id', $refundItem->product_id)->lockForUpdate()->first();
                if ($product) {
                    $product->increment('stock', $refundItem->quantity);
                }
            }

            $lockedRefund->update([
                'status' => Refund::STATUS_APPROVED,
                'audit_remark' => $auditRemark,
                'audited_at' => now(),
            ]);

            $lockedRefund->update(['status' => Refund::STATUS_COMPLETED]);

            return $lockedRefund->fresh()->load('items', 'order');
        });
    }

    public function reject(Refund $refund, string $auditRemark = ''): Refund
    {
        return DB::transaction(function () use ($refund, $auditRemark) {
            $lockedRefund = Refund::where('id', $refund->id)->lockForUpdate()->first();
            if (!$lockedRefund) {
                throw new \InvalidArgumentException('退款单不存在');
            }
            if ($lockedRefund->status !== Refund::STATUS_PENDING) {
                throw new \InvalidArgumentException('仅待审核的退款单可拒绝');
            }

            $lockedRefund->update([
                'status' => Refund::STATUS_REJECTED,
                'audit_remark' => $auditRemark,
                'audited_at' => now(),
            ]);

            return $lockedRefund->fresh()->load('items', 'order');
        });
    }

    public function getOrderItemRefundedQuantities(Order $order): array
    {
        $result = [];
        foreach ($order->items as $item) {
            $refunded = RefundItem::where('order_item_id', $item->id)
                ->whereHas('refund', function ($q) {
                    $q->whereIn('status', [Refund::STATUS_APPROVED, Refund::STATUS_COMPLETED, Refund::STATUS_PENDING]);
                })
                ->sum('quantity');
            $result[$item->id] = (int) $refunded;
        }
        return $result;
    }
}
