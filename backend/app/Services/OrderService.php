<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductSku;
use App\Models\StockMovement;
use App\Models\Coupon;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class OrderService
{
    const SCALE = 2;

    public function __construct(
        private InventoryService $inventoryService,
        private CouponService $couponService,
        private CustomerService $customerService
    ) {}

    /**
     * @param array{filters?: array{order_no?: string, date_from?: string, date_to?: string}} $options
     */
    public function list(int $perPage = 15, ?string $status = null, array $options = []): LengthAwarePaginator
    {
        $q = Order::with(['items', 'items.product', 'items.sku', 'refunds', 'refunds.items', 'coupons', 'customer'])->orderBy('id', 'desc');
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
        $paginator = $q->paginate($perPage);
        $paginator->getCollection()->each(function ($order) {
            $order->setAppends(['refund_status', 'total_refunded_amount']);
        });
        return $paginator;
    }

    /**
     * @param array{
     *   items: array<int, array{product_id: int, product_sku_id?: int, quantity: int}>,
     *   remark?: string,
     *   coupon_code?: string
     * } $data
     */
    public function create(array $data): Order
    {
        $items = $data['items'] ?? [];
        if (empty($items)) {
            throw new \InvalidArgumentException('订单至少需要一件商品');
        }

        $couponCode = isset($data['coupon_code']) ? trim($data['coupon_code']) : null;

        return DB::transaction(function () use ($items, $data, $couponCode) {
            $orderNo = 'ORD' . date('YmdHis') . str_pad((string) random_int(1, 99), 2, '0', STR_PAD_LEFT);
            $originalTotal = '0.00';
            $orderItems = [];
            $stockChanges = [];
            $orderItemContexts = [];

            foreach ($items as $row) {
                $product = Product::find($row['product_id']);
                if (!$product || $product->status != Product::STATUS_ACTIVE) {
                    throw new \InvalidArgumentException("商品不存在或已下架：{$row['product_id']}");
                }

                $qty = (int) ($row['quantity'] ?? 0);
                if ($qty <= 0) {
                    continue;
                }

                $sku = $this->resolveSku($product, $row);
                if (!$sku) {
                    throw new \InvalidArgumentException("商品【{$product->name}】SKU 不存在");
                }

                if ($sku->stock < $qty) {
                    $specText = $sku->spec_text ? "（{$sku->spec_text}）" : '';
                    throw new \InvalidArgumentException("商品【{$product->name}{$specText}】库存不足，当前：{$sku->stock}");
                }

                $subtotal = bcmul((string) $sku->price, (string) $qty, self::SCALE);
                $originalTotal = bcadd($originalTotal, $subtotal, self::SCALE);

                $skuSpecs = [];
                foreach ($sku->specValues as $sv) {
                    $skuSpecs[$sv->spec->name] = $sv->value;
                }

                $orderItems[] = [
                    'product_id' => $product->id,
                    'product_sku_id' => $sku->id,
                    'product_name' => $product->name,
                    'sku_code' => $sku->sku,
                    'sku_specs' => $skuSpecs,
                    'price' => $sku->price,
                    'quantity' => $qty,
                    'subtotal' => $subtotal,
                ];
                $stockChanges[] = ['sku' => $sku, 'product' => $product, 'qty' => $qty];
                $orderItemContexts[] = ['product' => $product, 'row' => $row, 'subtotal' => $subtotal];
            }

            if (empty($orderItems)) {
                throw new \InvalidArgumentException('订单至少需要一件有效商品');
            }

            $discountAmount = '0.00';
            $redeemedCoupon = null;

            if ($couponCode !== null && $couponCode !== '') {
                $validationItems = [];
                foreach ($items as $row) {
                    $validationItems[] = [
                        'product_id' => $row['product_id'],
                        'product_sku_id' => $row['product_sku_id'] ?? null,
                        'quantity' => $row['quantity'],
                    ];
                }

                $validateResult = $this->couponService->validate($couponCode, $validationItems);
                if (!$validateResult['valid']) {
                    throw new \InvalidArgumentException($validateResult['message']);
                }

                $coupon = Coupon::where('id', $validateResult['coupon']['id'])
                    ->lockForUpdate()
                    ->first();

                if (!$coupon) {
                    throw new \InvalidArgumentException('优惠券不存在');
                }

                $revalidate = $this->couponService->validateCoupon($coupon, $validationItems);
                if (!$revalidate['valid']) {
                    throw new \InvalidArgumentException($revalidate['message']);
                }

                $discountAmount = $revalidate['discount_amount'];
                $redeemedCoupon = $coupon;
            }

            $payableAmount = bcsub($originalTotal, $discountAmount, self::SCALE);
            if (bccomp($payableAmount, '0.00', self::SCALE) < 0) {
                $payableAmount = '0.00';
            }

            $order = Order::create([
                'order_no' => $orderNo,
                'status' => Order::STATUS_PENDING,
                'original_amount' => $originalTotal,
                'total_amount' => $payableAmount,
                'discount_amount' => $discountAmount,
                'remark' => $data['remark'] ?? null,
                'customer_id' => $data['customer_id'] ?? null,
            ]);

            foreach ($orderItems as $item) {
                $order->items()->create($item);
            }

            if ($redeemedCoupon !== null) {
                $this->couponService->redeem($redeemedCoupon, $order, $discountAmount);
            }

            foreach ($stockChanges as $sc) {
                $this->inventoryService->changeSkuStock(
                    $sc['sku'],
                    -$sc['qty'],
                    StockMovement::SOURCE_ORDER_DEDUCT,
                    [
                        'related_type' => StockMovement::RELATED_TYPE_ORDER,
                        'related_id' => $order->id,
                        'reason' => '下单扣减库存',
                    ]
                );
            }

            return $order->load(['items.product', 'items.sku', 'coupons', 'customer']);
        });
    }

    /**
     * 解析 SKU，兼容旧格式（只有 product_id 时取默认 SKU）
     */
    private function resolveSku(Product $product, array $row): ?ProductSku
    {
        if (!empty($row['product_sku_id'])) {
            return ProductSku::where('id', $row['product_sku_id'])
                ->where('product_id', $product->id)
                ->first();
        }

        $defaultSku = $product->defaultSku;
        if ($defaultSku) {
            return $defaultSku;
        }

        return $product->skus->first();
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

        $oldStatus = $order->status;
        $shouldAddStats = in_array($status, [Order::STATUS_PAID, Order::STATUS_COMPLETED])
            && !in_array($oldStatus, [Order::STATUS_PAID, Order::STATUS_COMPLETED]);
        $shouldSubtractStats = $status === Order::STATUS_CANCELLED
            && in_array($oldStatus, [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED]);

        if ($status === Order::STATUS_CANCELLED && $order->status !== Order::STATUS_CANCELLED) {
            DB::transaction(function () use ($order) {
                foreach ($order->items as $item) {
                    $hasRefunded = \App\Models\RefundItem::where('order_item_id', $item->id)
                        ->whereHas('refund', function ($q) {
                            $q->whereIn('status', [\App\Models\Refund::STATUS_APPROVED, \App\Models\Refund::STATUS_COMPLETED]);
                        })
                        ->sum('quantity');
                    $remaining = $item->quantity - (int) $hasRefunded;
                    if ($remaining > 0) {
                        $sku = $item->sku;
                        if ($sku) {
                            $this->inventoryService->changeSkuStock(
                                $sku,
                                $remaining,
                                StockMovement::SOURCE_ORDER_CANCEL,
                                [
                                    'related_type' => StockMovement::RELATED_TYPE_ORDER,
                                    'related_id' => $order->id,
                                    'reason' => '取消订单回补库存',
                                ]
                            );
                        } else {
                            $product = Product::find($item->product_id);
                            if ($product) {
                                $this->inventoryService->changeStock(
                                    $product,
                                    $remaining,
                                    StockMovement::SOURCE_ORDER_CANCEL,
                                    [
                                        'related_type' => StockMovement::RELATED_TYPE_ORDER,
                                        'related_id' => $order->id,
                                        'reason' => '取消订单回补库存',
                                    ]
                                );
                            }
                        }
                    }
                }

                $this->couponService->releaseByOrder($order);
            });
        }

        $order->update(['status' => $status]);

        if ($order->customer_id) {
            $customer = Customer::find($order->customer_id);
            if ($customer) {
                if ($shouldAddStats) {
                    $this->customerService->addOrderStats($customer, (string) $order->total_amount);
                } elseif ($shouldSubtractStats) {
                    $this->customerService->subtractOrderStats($customer, (string) $order->total_amount);
                }
            }
        }

        return $order;
    }

    public function find(int $id): ?Order
    {
        $order = Order::with(['items.product', 'items.sku', 'refunds', 'refunds.items', 'coupons', 'customer'])->find($id);
        if ($order) {
            $order->setAppends(['refund_status', 'total_refunded_amount']);
        }
        return $order;
    }
}
