<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderCoupon;
use App\Support\BcMath;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class CouponService
{
    const SCALE = 2;

    public function list(int $perPage = 15, ?string $status = null): LengthAwarePaginator
    {
        $q = Coupon::orderBy('id', 'desc');
        if ($status !== null && $status !== '') {
            $q->where('status', $status);
        }
        return $q->paginate($perPage);
    }

    public function find(int $id): ?Coupon
    {
        return Coupon::find($id);
    }

    public function findByCode(string $code): ?Coupon
    {
        return Coupon::where('code', trim($code))->first();
    }

    public function create(array $data): Coupon
    {
        $categoryIds = $data['category_ids'] ?? null;
        if (is_array($categoryIds) && empty($categoryIds)) {
            $categoryIds = null;
        }
        return Coupon::create([
            'code' => trim($data['code']),
            'name' => trim($data['name']),
            'type' => $data['type'],
            'value' => $this->formatDecimal($data['value']),
            'min_amount' => $this->formatDecimal($data['min_amount'] ?? 0),
            'valid_from' => $data['valid_from'],
            'valid_until' => $data['valid_until'],
            'total_quantity' => (int) ($data['total_quantity'] ?? 1),
            'used_quantity' => 0,
            'category_ids' => $categoryIds,
            'status' => $data['status'] ?? Coupon::STATUS_ACTIVE,
            'description' => isset($data['description']) ? trim($data['description']) : null,
        ]);
    }

    public function update(Coupon $coupon, array $data): Coupon
    {
        $categoryIds = $data['category_ids'] ?? null;
        if (is_array($categoryIds) && empty($categoryIds)) {
            $categoryIds = null;
        }
        $coupon->update([
            'name' => trim($data['name']),
            'type' => $data['type'],
            'value' => $this->formatDecimal($data['value']),
            'min_amount' => $this->formatDecimal($data['min_amount'] ?? 0),
            'valid_from' => $data['valid_from'],
            'valid_until' => $data['valid_until'],
            'total_quantity' => max($coupon->used_quantity, (int) ($data['total_quantity'] ?? 1)),
            'category_ids' => $categoryIds,
            'description' => isset($data['description']) ? trim($data['description']) : $coupon->description,
        ]);
        return $coupon->fresh();
    }

    public function toggleStatus(Coupon $coupon): Coupon
    {
        $newStatus = $coupon->status === Coupon::STATUS_ACTIVE ? Coupon::STATUS_INACTIVE : Coupon::STATUS_ACTIVE;
        $coupon->update(['status' => $newStatus]);
        return $coupon->fresh();
    }

    public function validate(string $code, array $items): array
    {
        $coupon = $this->findByCode($code);
        if (!$coupon) {
            return ['valid' => false, 'message' => '优惠券不存在'];
        }
        return $this->validateCoupon($coupon, $items);
    }

    public function validateCoupon(Coupon $coupon, array $items): array
    {
        if ($coupon->status !== Coupon::STATUS_ACTIVE) {
            return ['valid' => false, 'message' => '优惠券已停用'];
        }

        $now = now();
        if ($coupon->valid_from && $now->lt($coupon->valid_from)) {
            return ['valid' => false, 'message' => '优惠券尚未生效'];
        }
        if ($coupon->valid_until && $now->gt($coupon->valid_until)) {
            return ['valid' => false, 'message' => '优惠券已过期'];
        }
        if ($coupon->remaining_quantity <= 0) {
            return ['valid' => false, 'message' => '优惠券已领完'];
        }

        $applicableItems = [];
        $applicableTotal = '0.00';
        $originalTotal = '0.00';

        foreach ($items as $row) {
            $productId = (int) ($row['product_id'] ?? 0);
            $qty = (int) ($row['quantity'] ?? 0);
            if ($productId <= 0 || $qty <= 0) {
                continue;
            }

            $product = \App\Models\Product::with('category')->find($productId);
            if (!$product) {
                continue;
            }

            $sku = $this->resolveSkuForItem($product, $row);
            if (!$sku) {
                continue;
            }

            $subtotal = BcMath::mul((string) $sku->price, (string) $qty, self::SCALE);
            $originalTotal = BcMath::add($originalTotal, $subtotal, self::SCALE);

            $categoryId = $product->category_id;
            if ($coupon->isCategoryAllowed($categoryId)) {
                $applicableItems[] = [
                    'product_id' => $productId,
                    'subtotal' => $subtotal,
                ];
                $applicableTotal = BcMath::add($applicableTotal, $subtotal, self::SCALE);
            }
        }

        if (BcMath::comp($applicableTotal, '0.00', self::SCALE) <= 0) {
            return ['valid' => false, 'message' => '当前订单中没有适用该优惠券的商品'];
        }

        if (BcMath::comp($applicableTotal, (string) $coupon->min_amount, self::SCALE) < 0) {
            $diff = BcMath::sub((string) $coupon->min_amount, $applicableTotal, self::SCALE);
            return ['valid' => false, 'message' => "适用商品金额不足，还差 ¥{$diff}"];
        }

        $discountAmount = $this->calculateDiscount($coupon, $applicableTotal);
        $payableAmount = BcMath::sub($originalTotal, $discountAmount, self::SCALE);
        if (BcMath::comp($payableAmount, '0.00', self::SCALE) < 0) {
            $payableAmount = '0.00';
            $discountAmount = $originalTotal;
        }

        return [
            'valid' => true,
            'message' => '优惠券可用',
            'coupon' => [
                'id' => $coupon->id,
                'code' => $coupon->code,
                'name' => $coupon->name,
                'type' => $coupon->type,
                'value' => (string) $coupon->value,
                'min_amount' => (string) $coupon->min_amount,
                'description' => $coupon->description,
            ],
            'original_amount' => $originalTotal,
            'applicable_amount' => $applicableTotal,
            'discount_amount' => $discountAmount,
            'payable_amount' => $payableAmount,
        ];
    }

    public function calculateDiscount(Coupon $coupon, string $applicableTotal): string
    {
        if ($coupon->type === Coupon::TYPE_FIXED) {
            $discount = (string) $coupon->value;
            if (BcMath::comp($discount, $applicableTotal, self::SCALE) > 0) {
                $discount = $applicableTotal;
            }
            return $this->formatDecimal($discount);
        }

        if ($coupon->type === Coupon::TYPE_PERCENT) {
            $percent = (float) $coupon->value;
            if ($percent <= 0) {
                return '0.00';
            }
            if ($percent >= 100) {
                return $this->formatDecimal($applicableTotal);
            }
            $rate = (string) ($percent / 100);
            $raw = BcMath::mul($applicableTotal, $rate, 4);
            $discount = BcMath::floor($raw, self::SCALE);
            if (BcMath::comp($discount, $applicableTotal, self::SCALE) > 0) {
                $discount = $applicableTotal;
            }
            return $this->formatDecimal($discount);
        }

        return '0.00';
    }

    public function redeem(Coupon $coupon, Order $order, string $discountAmount): OrderCoupon
    {
        $affected = Coupon::where('id', $coupon->id)
            ->where('used_quantity', '<', DB::raw('total_quantity'))
            ->update(['used_quantity' => DB::raw('used_quantity + 1')]);

        if ($affected === 0) {
            throw new \RuntimeException('优惠券核销失败，库存不足或已被占用');
        }

        return OrderCoupon::create([
            'order_id' => $order->id,
            'coupon_id' => $coupon->id,
            'coupon_code' => $coupon->code,
            'coupon_name' => $coupon->name,
            'coupon_type' => $coupon->type,
            'coupon_value' => $coupon->value,
            'discount_amount' => $this->formatDecimal($discountAmount),
            'status' => OrderCoupon::STATUS_USED,
            'released_amount' => '0.00',
        ]);
    }

    public function releaseByOrder(Order $order): void
    {
        $orderCoupons = OrderCoupon::where('order_id', $order->id)
            ->whereIn('status', [OrderCoupon::STATUS_USED, OrderCoupon::STATUS_PARTIAL_RELEASED])
            ->get();

        foreach ($orderCoupons as $oc) {
            if ($oc->status === OrderCoupon::STATUS_USED) {
                $this->decrementUsed($oc->coupon_id, 1);
            } elseif ($oc->status === OrderCoupon::STATUS_PARTIAL_RELEASED) {
                $this->decrementUsed($oc->coupon_id, 1);
            }
            $oc->update([
                'status' => OrderCoupon::STATUS_RELEASED,
                'released_amount' => $oc->discount_amount,
            ]);
        }
    }

    public function partialRelease(Order $order, string $refundRatio): void
    {
        $orderCoupons = OrderCoupon::where('order_id', $order->id)
            ->where('status', OrderCoupon::STATUS_USED)
            ->get();

        foreach ($orderCoupons as $oc) {
            $toRelease = BcMath::mul((string) $oc->discount_amount, $refundRatio, 4);
            $toRelease = BcMath::floor($toRelease, self::SCALE);

            if (BcMath::comp($toRelease, '0.00', self::SCALE) <= 0) {
                continue;
            }

            $newReleased = BcMath::add((string) $oc->released_amount, $toRelease, self::SCALE);
            $isFullRelease = BcMath::comp($newReleased, (string) $oc->discount_amount, self::SCALE) >= 0;

            if ($isFullRelease) {
                $this->decrementUsed($oc->coupon_id, 1);
                $oc->update([
                    'status' => OrderCoupon::STATUS_RELEASED,
                    'released_amount' => $oc->discount_amount,
                ]);
            } else {
                $oc->update([
                    'status' => OrderCoupon::STATUS_PARTIAL_RELEASED,
                    'released_amount' => $newReleased,
                ]);
            }
        }
    }

    private function decrementUsed(int $couponId, int $count): void
    {
        Coupon::where('id', $couponId)
            ->where('used_quantity', '>=', $count)
            ->update(['used_quantity' => DB::raw("used_quantity - {$count}")]);
    }

    private function formatDecimal($value): string
    {
        return BcMath::format($value, self::SCALE);
    }

    private function resolveSkuForItem(\App\Models\Product $product, array $row): ?\App\Models\ProductSku
    {
        if (!empty($row['product_sku_id'])) {
            return \App\Models\ProductSku::where('id', $row['product_sku_id'])
                ->where('product_id', $product->id)
                ->first();
        }
        if ($product->relationLoaded('skus') && $product->skus->isNotEmpty()) {
            return $product->defaultSku ?? $product->skus->first();
        }
        $default = $product->defaultSku;
        if ($default) {
            return $default;
        }
        return $product->skus()->first();
    }

    public function computeOrderApplicableTotal(Coupon $coupon, Order $order): string
    {
        $total = '0.00';
        foreach ($order->items as $item) {
            $product = \App\Models\Product::find($item->product_id);
            if (!$product) {
                continue;
            }
            if ($coupon->isCategoryAllowed((int) $product->category_id)) {
                $total = BcMath::add($total, (string) $item->subtotal, self::SCALE);
            }
        }
        return $total;
    }
}
