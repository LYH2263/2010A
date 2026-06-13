<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Product;
use App\Models\ProductSku;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class NotificationService
{
    const DEFAULT_ALERT_THRESHOLD = 10;
    const DEDUPLICATION_WINDOW_MINUTES = 30;

    public function getDefaultThreshold(): int
    {
        return (int) config('inventory.default_alert_threshold', self::DEFAULT_ALERT_THRESHOLD);
    }

    public function resolveThreshold(Product $product, ?ProductSku $sku = null): int
    {
        if ($sku && $sku->alert_threshold !== null) {
            return (int) $sku->alert_threshold;
        }
        if ($product->alert_threshold !== null) {
            return (int) $product->alert_threshold;
        }
        return $this->getDefaultThreshold();
    }

    public function getCurrentStock(Product $product, ?ProductSku $sku = null): int
    {
        if ($sku) {
            return (int) $sku->stock;
        }
        return (int) $product->total_stock;
    }

    public function checkAndCreateLowStockAlert(Product $product, ?ProductSku $sku = null): ?Notification
    {
        $threshold = $this->resolveThreshold($product, $sku);
        $currentStock = $this->getCurrentStock($product, $sku);

        if ($currentStock > $threshold) {
            return null;
        }

        if ($this->shouldDeduplicate($product, $sku)) {
            return null;
        }

        if (!$this->isFirstTimeBelowThreshold($product, $sku, $threshold)) {
            return null;
        }

        return $this->createLowStockNotification($product, $sku, $currentStock, $threshold);
    }

    private function shouldDeduplicate(Product $product, ?ProductSku $sku = null): bool
    {
        $since = now()->subMinutes(self::DEDUPLICATION_WINDOW_MINUTES);

        $query = Notification::where('type', Notification::TYPE_LOW_STOCK)
            ->where('product_id', $product->id)
            ->where('created_at', '>=', $since);

        if ($sku) {
            $query->where('product_sku_id', $sku->id);
        } else {
            $query->whereNull('product_sku_id');
        }

        return $query->exists();
    }

    private function isFirstTimeBelowThreshold(Product $product, ?ProductSku $sku, int $threshold): bool
    {
        $query = Notification::where('type', Notification::TYPE_LOW_STOCK)
            ->where('product_id', $product->id);

        if ($sku) {
            $query->where('product_sku_id', $sku->id);
        } else {
            $query->whereNull('product_sku_id');
        }

        $lastAlert = $query->orderBy('id', 'desc')->first();

        if (!$lastAlert) {
            return true;
        }

        $lastExtra = $lastAlert->extra_data ?? [];
        $lastStockAboveThreshold = $lastExtra['stock_before'] ?? null;

        if ($lastStockAboveThreshold === null) {
            return false;
        }

        return $lastStockAboveThreshold > $threshold;
    }

    private function createLowStockNotification(
        Product $product,
        ?ProductSku $sku,
        int $currentStock,
        int $threshold
    ): Notification {
        $skuText = '';
        if ($sku) {
            $specText = $sku->spec_text;
            $skuText = $specText ? "（{$specText}）" : "（SKU: {$sku->sku}）";
        }

        $message = "商品【{$product->name}】{$skuText}库存降至 {$currentStock}，低于预警阈值 {$threshold}，请及时补货。";

        $beforeStock = $this->getStockBeforeChange($product, $sku, $currentStock);

        return Notification::create([
            'type' => Notification::TYPE_LOW_STOCK,
            'product_id' => $product->id,
            'product_sku_id' => $sku?->id,
            'message' => $message,
            'extra_data' => [
                'current_stock' => $currentStock,
                'threshold' => $threshold,
                'stock_before' => $beforeStock,
                'product_name' => $product->name,
                'product_sku' => $sku?->sku,
                'sku_spec_text' => $sku?->spec_text,
            ],
            'is_read' => false,
        ]);
    }

    private function getStockBeforeChange(Product $product, ?ProductSku $sku, int $currentStock): int
    {
        $latestMovement = null;

        if ($sku) {
            $latestMovement = \App\Models\StockMovement::where('product_sku_id', $sku->id)
                ->orderBy('id', 'desc')
                ->first();
        } else {
            $latestMovement = \App\Models\StockMovement::where('product_id', $product->id)
                ->whereNull('product_sku_id')
                ->orderBy('id', 'desc')
                ->first();
        }

        if ($latestMovement) {
            return (int) $latestMovement->before_quantity;
        }

        return $currentStock;
    }

    public function list(int $perPage = 15, array $options = []): LengthAwarePaginator
    {
        $q = Notification::with(['product', 'sku.product'])->orderBy('id', 'desc');

        $filters = $options['filters'] ?? [];

        if (isset($filters['is_read']) && $filters['is_read'] !== '' && $filters['is_read'] !== null) {
            $q->where('is_read', (bool) $filters['is_read']);
        }

        if (!empty($filters['type'])) {
            $q->where('type', $filters['type']);
        }

        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->where(function ($subQ) use ($kw) {
                $subQ->where('message', 'like', '%' . $kw . '%')
                    ->orWhereHas('product', function ($productQ) use ($kw) {
                        $productQ->where('name', 'like', '%' . $kw . '%')
                            ->orWhere('sku', 'like', '%' . $kw . '%');
                    });
            });
        }

        return $q->paginate($perPage);
    }

    public function getRecentUnread(int $limit = 10): \Illuminate\Database\Eloquent\Collection
    {
        return Notification::with(['product', 'sku.product'])
            ->unread()
            ->orderBy('id', 'desc')
            ->limit($limit)
            ->get();
    }

    public function getRecent(int $limit = 10): \Illuminate\Database\Eloquent\Collection
    {
        return Notification::with(['product', 'sku.product'])
            ->orderBy('id', 'desc')
            ->limit($limit)
            ->get();
    }

    public function unreadCount(): int
    {
        return Notification::unread()->count();
    }

    public function markAsRead(int $id): ?Notification
    {
        $notification = Notification::find($id);
        if ($notification) {
            $notification->markAsRead();
        }
        return $notification;
    }

    public function markAllAsRead(): int
    {
        return Notification::unread()->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
    }

    public function find(int $id): ?Notification
    {
        return Notification::with(['product', 'sku.product'])->find($id);
    }
}
