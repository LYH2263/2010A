<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Product;
use App\Models\ProductSku;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Pagination\LengthAwarePaginator;

class PurchaseOrderService
{
    private InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function generateOrderNo(): string
    {
        $prefix = 'PO' . date('Ymd');
        $last = PurchaseOrder::where('order_no', 'like', $prefix . '%')
            ->orderBy('order_no', 'desc')
            ->lockForUpdate()
            ->first();
        if ($last) {
            $seq = (int) substr($last->order_no, -4) + 1;
        } else {
            $seq = 1;
        }
        return $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * 计算明细小计与总额，确保金额精度（2位小数）
     * 兼容无 bcmath 扩展的环境
     */
    private function calculateAmounts(array &$items): array
    {
        $total = 0;
        foreach ($items as &$item) {
            $qty = (int) $item['quantity'];
            $price = round((float) $item['unit_price'], 2);
            $subtotal = round($qty * $price, 2);
            $item['unit_price'] = number_format($price, 2, '.', '');
            $item['subtotal'] = number_format($subtotal, 2, '.', '');
            $total = round($total + $subtotal, 2);
            unset($item);
        }
        return [
            'items' => $items,
            'total_amount' => number_format($total, 2, '.', ''),
        ];
    }

    /**
     * @param array{filters?: array{keyword?: string, supplier_id?: int, status?: int, date_from?: string, date_to?: string}} $options
     */
    public function list(int $perPage = 15, array $options = []): LengthAwarePaginator
    {
        $q = PurchaseOrder::with(['supplier', 'creator'])->orderBy('id', 'desc');
        $filters = $options['filters'] ?? [];

        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->where(function ($sub) use ($kw) {
                $sub->where('order_no', 'like', '%' . $kw . '%')
                    ->orWhereHas('supplier', function ($s) use ($kw) {
                        $s->where('name', 'like', '%' . $kw . '%');
                    });
            });
        }

        if (!empty($filters['supplier_id']) && $filters['supplier_id'] !== '') {
            $q->where('supplier_id', (int) $filters['supplier_id']);
        }

        if (isset($filters['status']) && $filters['status'] !== '' && $filters['status'] !== null) {
            $q->where('status', (int) $filters['status']);
        }

        if (!empty($filters['date_from'])) {
            $q->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $q->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $q->paginate($perPage);
    }

    public function detail(int $id): ?PurchaseOrder
    {
        return PurchaseOrder::with([
            'supplier',
            'creator',
            'items.product',
            'items.sku.specValues.spec',
        ])->find($id);
    }

    public function create(array $data, int $status = PurchaseOrder::STATUS_DRAFT): PurchaseOrder
    {
        return DB::transaction(function () use ($data, $status) {
            $items = $data['items'] ?? [];
            if (empty($items)) {
                throw new \InvalidArgumentException('采购明细不能为空');
            }

            $amountResult = $this->calculateAmounts($items);
            $items = $amountResult['items'];
            $totalAmount = $amountResult['total_amount'];

            $order = PurchaseOrder::create([
                'order_no' => $this->generateOrderNo(),
                'supplier_id' => (int) $data['supplier_id'],
                'status' => $status,
                'total_amount' => $totalAmount,
                'remark' => $data['remark'] ?? null,
                'created_by' => Auth::check() ? Auth::id() : null,
                'submitted_at' => $status === PurchaseOrder::STATUS_SUBMITTED ? now() : null,
            ]);

            foreach ($items as $item) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $order->id,
                    'product_id' => (int) $item['product_id'],
                    'product_sku_id' => !empty($item['product_sku_id']) ? (int) $item['product_sku_id'] : null,
                    'quantity' => (int) $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['subtotal'],
                ]);
            }

            return $order->fresh()->load([
                'supplier',
                'items.product',
                'items.sku.specValues.spec',
            ]);
        });
    }

    public function saveDraft(array $data): PurchaseOrder
    {
        return $this->create($data, PurchaseOrder::STATUS_DRAFT);
    }

    public function createAndSubmit(array $data): PurchaseOrder
    {
        return $this->create($data, PurchaseOrder::STATUS_SUBMITTED);
    }

    public function update(PurchaseOrder $order, array $data): PurchaseOrder
    {
        if (!$order->canEdit()) {
            throw new \InvalidArgumentException('当前状态不允许编辑，只有草稿状态的采购单可修改');
        }

        return DB::transaction(function () use ($order, $data) {
            $items = $data['items'] ?? [];
            if (empty($items)) {
                throw new \InvalidArgumentException('采购明细不能为空');
            }

            $amountResult = $this->calculateAmounts($items);
            $items = $amountResult['items'];
            $totalAmount = $amountResult['total_amount'];

            $order->update([
                'supplier_id' => (int) $data['supplier_id'],
                'total_amount' => $totalAmount,
                'remark' => $data['remark'] ?? null,
            ]);

            $order->items()->delete();
            foreach ($items as $item) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $order->id,
                    'product_id' => (int) $item['product_id'],
                    'product_sku_id' => !empty($item['product_sku_id']) ? (int) $item['product_sku_id'] : null,
                    'quantity' => (int) $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['subtotal'],
                ]);
            }

            return $order->fresh()->load([
                'supplier',
                'items.product',
                'items.sku.specValues.spec',
            ]);
        });
    }

    public function submit(PurchaseOrder $order): PurchaseOrder
    {
        if (!$order->canSubmit()) {
            throw new \InvalidArgumentException('当前状态不允许提交，只有草稿状态的采购单可提交');
        }
        if ($order->items()->count() === 0) {
            throw new \InvalidArgumentException('采购明细为空，无法提交');
        }

        $order->update([
            'status' => PurchaseOrder::STATUS_SUBMITTED,
            'submitted_at' => now(),
        ]);

        return $order->fresh()->load(['supplier', 'items']);
    }

    public function stockIn(PurchaseOrder $order): PurchaseOrder
    {
        if (!$order->canStockIn()) {
            if ($order->status === PurchaseOrder::STATUS_STOCKED) {
                throw new \InvalidArgumentException('该采购单已入库，不可重复入库');
            }
            throw new \InvalidArgumentException('当前状态不允许入库，只有已提交状态的采购单可入库');
        }

        return DB::transaction(function () use ($order) {
            $locked = PurchaseOrder::where('id', $order->id)->lockForUpdate()->first();
            if (!$locked) {
                throw new \InvalidArgumentException('采购单不存在');
            }
            if (!$locked->canStockIn()) {
                if ($locked->status === PurchaseOrder::STATUS_STOCKED) {
                    throw new \InvalidArgumentException('该采购单已入库，不可重复入库');
                }
                throw new \InvalidArgumentException('当前状态不允许入库');
            }

            $items = $locked->items()->with(['product', 'sku'])->get();
            if ($items->isEmpty()) {
                throw new \InvalidArgumentException('采购明细为空，无法入库');
            }

            $operatorId = Auth::check() ? Auth::id() : null;

            foreach ($items as $item) {
                $delta = (int) $item->quantity;
                if ($delta <= 0) {
                    continue;
                }

                if (!empty($item->product_sku_id) && $item->sku) {
                    $this->inventoryService->changeSkuStock(
                        $item->sku,
                        $delta,
                        StockMovement::SOURCE_PURCHASE_IN,
                        [
                            'related_type' => StockMovement::RELATED_TYPE_PURCHASE_ORDER,
                            'related_id' => $locked->id,
                            'operator_id' => $operatorId,
                            'reason' => '采购入库：' . $locked->order_no,
                        ]
                    );
                } else {
                    $this->inventoryService->changeStock(
                        $item->product,
                        $delta,
                        StockMovement::SOURCE_PURCHASE_IN,
                        [
                            'related_type' => StockMovement::RELATED_TYPE_PURCHASE_ORDER,
                            'related_id' => $locked->id,
                            'operator_id' => $operatorId,
                            'reason' => '采购入库：' . $locked->order_no,
                        ]
                    );
                }
            }

            $locked->update([
                'status' => PurchaseOrder::STATUS_STOCKED,
                'stocked_at' => now(),
            ]);

            return $locked->fresh()->load([
                'supplier',
                'creator',
                'items.product',
                'items.sku.specValues.spec',
            ]);
        });
    }

    public function delete(PurchaseOrder $order): void
    {
        if (!$order->canDelete()) {
            throw new \InvalidArgumentException('当前状态不允许删除，只有草稿状态的采购单可删除');
        }
        DB::transaction(function () use ($order) {
            $order->items()->delete();
            $order->delete();
        });
    }

    public function getCreateMeta(): array
    {
        return [
            'suppliers' => Supplier::where('status', Supplier::STATUS_ACTIVE)
                ->orderBy('name')
                ->get(['id', 'name', 'contact_person', 'phone']),
            'status_labels' => PurchaseOrder::$statusLabels,
        ];
    }
}
