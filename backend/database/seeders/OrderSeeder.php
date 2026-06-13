<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        $products = Product::all();
        if ($products->isEmpty()) {
            return;
        }

        $statuses = [
            Order::STATUS_PENDING,
            Order::STATUS_PAID,
            Order::STATUS_PAID,
            Order::STATUS_SHIPPED,
            Order::STATUS_SHIPPED,
            Order::STATUS_CANCELLED,
        ];

        $orderIndex = 0;
        // 过去 10 天内每天生成若干订单，便于图表与分页测试
        for ($daysAgo = 9; $daysAgo >= 0; $daysAgo--) {
            $date = Carbon::today()->subDays($daysAgo);
            $countPerDay = $daysAgo === 0 ? 2 : (int) (5 + $daysAgo * 2); // 最近几天少一点，前面几天多一点
            $countPerDay = min($countPerDay, 12);

            for ($i = 0; $i < $countPerDay; $i++) {
                $orderIndex++;
                $orderNo = 'ORD' . $date->format('Ymd') . str_pad((string) ($orderIndex), 3, '0', STR_PAD_LEFT);
                if (Order::where('order_no', $orderNo)->exists()) {
                    continue;
                }

                $status = $statuses[$orderIndex % count($statuses)];
                $itemsCount = random_int(1, 3);
                $orderProducts = $products->random(min($itemsCount, $products->count()));
                $total = 0;
                $itemsData = [];

                foreach ($orderProducts as $p) {
                    $qty = random_int(1, 3);
                    $subtotal = round($p->price * $qty, 2);
                    $total += $subtotal;
                    $itemsData[] = [
                        'product_id' => $p->id,
                        'product_name' => $p->name,
                        'price' => $p->price,
                        'quantity' => $qty,
                        'subtotal' => $subtotal,
                    ];
                }

                $order = Order::create([
                    'order_no' => $orderNo,
                    'status' => $status,
                    'total_amount' => round($total, 2),
                    'remark' => $orderIndex <= 3 ? '演示订单' : null,
                    'created_at' => $date->copy()->addHours(random_int(8, 20))->addMinutes(random_int(0, 59)),
                    'updated_at' => $date->copy()->addHours(random_int(8, 20))->addMinutes(random_int(0, 59)),
                ]);

                foreach ($itemsData as $item) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $item['product_id'],
                        'product_name' => $item['product_name'],
                        'price' => $item['price'],
                        'quantity' => $item['quantity'],
                        'subtotal' => $item['subtotal'],
                    ]);
                }
            }
        }
    }
}
