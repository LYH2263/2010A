<?php

namespace App\Services;

use App\Models\Supplier;
use App\Models\PurchaseOrder;
use Illuminate\Pagination\LengthAwarePaginator;

class SupplierService
{
    /**
     * @param array{filters?: array{keyword?: string, status?: int}} $options
     */
    public function list(int $perPage = 15, array $options = []): LengthAwarePaginator
    {
        $q = Supplier::orderBy('id', 'desc');
        $filters = $options['filters'] ?? [];

        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->where(function ($sub) use ($kw) {
                $sub->where('name', 'like', '%' . $kw . '%')
                    ->orWhere('contact_person', 'like', '%' . $kw . '%')
                    ->orWhere('phone', 'like', '%' . $kw . '%');
            });
        }

        if (isset($filters['status']) && $filters['status'] !== '' && $filters['status'] !== null) {
            $q->where('status', (int) $filters['status']);
        }

        return $q->paginate($perPage);
    }

    public function create(array $data): Supplier
    {
        return Supplier::create($data);
    }

    public function update(Supplier $supplier, array $data): Supplier
    {
        $supplier->update($data);
        return $supplier->fresh();
    }

    public function delete(Supplier $supplier): void
    {
        if (PurchaseOrder::where('supplier_id', $supplier->id)->exists()) {
            throw new \InvalidArgumentException('该供应商下存在采购单，无法删除。请先删除相关采购单后再试。');
        }
        $supplier->delete();
    }

    public function allActiveForSelect(): \Illuminate\Database\Eloquent\Collection
    {
        return Supplier::where('status', Supplier::STATUS_ACTIVE)
            ->orderBy('name')
            ->get(['id', 'name', 'contact_person', 'phone']);
    }
}
