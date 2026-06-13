<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class OrderService
{
    /**
     * @param array{filters?: array{order_no?: string, date_from?: string, date_to?: string}} $options
     */
    public function list(int $perPage = 15, ?string $status = null, array $options = []): LengthAwarePaginator
    {
        $q = Order::with('items')->orderBy('id', 'desc');
        if ($status !== null && $status !== '') {
            $q->where('status', $status);
        }
        $filters = $options['filters'] ?? [];
        if (!empty($filters['order_no'])) {
            $q->where('order_no', 'like', '%' . trim($filters['order_no']) . '%');
        }
        if (!empty($filters['date_from'])) {
            $q->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $q->whereDate('created_at', '<=', $filters['date_to']);
        }
        return $q->paginate($perPage);
    }

    public function create(array $data): Order
    {
        $items = $data['items'] ?? [];
        if (empty($items)) {
            throw new \InvalidArgumentException('订单至少需要一件商品');
        }

        return DB::transaction(function () use ($items, $data) {
            $orderNo = 'ORD' . date('YmdHis') . str_pad((string) random_int(1, 99), 2, '0', STR_PAD_LEFT);
            $total = 0;
            $orderItems = [];

            foreach ($items as $row) {
                $product = Product::find($row['product_id']);
                if (!$product || $product->status != Product::STATUS_ACTIVE) {
                    throw new \InvalidArgumentException("商品不存在或已下架：{$row['product_id']}");
                }
                $qty = (int) ($row['quantity'] ?? 0);
                if ($qty <= 0) {
                    continue;
                }
                if ($product->stock < $qty) {
                    throw new \InvalidArgumentException("商品【{$product->name}】库存不足，当前：{$product->stock}");
                }
                $subtotal = $product->price * $qty;
                $total += $subtotal;
                $orderItems[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'price' => $product->price,
                    'quantity' => $qty,
                    'subtotal' => $subtotal,
                ];
                $product->decrement('stock', $qty);
            }

            if (empty($orderItems)) {
                throw new \InvalidArgumentException('订单至少需要一件有效商品');
            }

            $order = Order::create([
                'order_no' => $orderNo,
                'status' => Order::STATUS_PENDING,
                'total_amount' => $total,
                'remark' => $data['remark'] ?? null,
            ]);

            foreach ($orderItems as $item) {
                $order->items()->create($item);
            }

            return $order->load('items');
        });
    }

    public function updateStatus(Order $order, string $status): Order
    {
        $allowed = [Order::STATUS_PENDING, Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_CANCELLED, Order::STATUS_COMPLETED];
        if (!in_array($status, $allowed)) {
            throw new \InvalidArgumentException('无效的订单状态');
        }
        if ($status === Order::STATUS_COMPLETED && $order->status !== Order::STATUS_SHIPPED) {
            throw new \InvalidArgumentException('仅已发货的订单可标记为已完成');
        }
        if ($status === Order::STATUS_CANCELLED && $order->status !== Order::STATUS_CANCELLED) {
            foreach ($order->items as $item) {
                $item->product()->increment('stock', $item->quantity);
            }
        }
        $order->update(['status' => $status]);
        return $order;
    }

    public function find(int $id): ?Order
    {
        return Order::with('items.product')->find($id);
    }
}
