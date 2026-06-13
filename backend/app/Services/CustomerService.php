<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class CustomerService
{
    public function list(int $perPage = 15, array $options = []): LengthAwarePaginator
    {
        $q = Customer::orderBy('id', 'desc');
        $filters = $options['filters'] ?? [];

        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->where(function ($sub) use ($kw) {
                $sub->where('name', 'like', '%' . $kw . '%')
                    ->orWhere('phone', 'like', '%' . $kw . '%');
            });
        }

        if (isset($filters['status']) && $filters['status'] !== '' && $filters['status'] !== null) {
            $q->where('status', (int) $filters['status']);
        }

        if (!empty($filters['level'])) {
            $q->where('level', $filters['level']);
        }

        return $q->paginate($perPage);
    }

    public function create(array $data): Customer
    {
        return Customer::create($data);
    }

    public function update(Customer $customer, array $data): Customer
    {
        $customer->update($data);
        return $customer->fresh();
    }

    public function delete(Customer $customer): void
    {
        if (Order::where('customer_id', $customer->id)->exists()) {
            throw new \InvalidArgumentException('该客户下存在关联订单，无法删除。请先处理相关订单后再试。');
        }
        $customer->delete();
    }

    public function find(int $id): ?Customer
    {
        return Customer::find($id);
    }

    public function findWithOrders(int $id): ?Customer
    {
        return Customer::with(['orders', 'orders.items', 'orders.refunds', 'orders.coupons'])->find($id);
    }

    public function addOrderStats(Customer $customer, string $amount): void
    {
        $customer->total_spent = bcadd((string) $customer->total_spent, $amount, 2);
        $customer->total_orders = $customer->total_orders + 1;
        $customer->save();
    }

    public function subtractOrderStats(Customer $customer, string $amount): void
    {
        $customer->total_spent = bcsub((string) $customer->total_spent, $amount, 2);
        if (bccomp((string) $customer->total_spent, '0.00', 2) < 0) {
            $customer->total_spent = '0.00';
        }
        $customer->total_orders = max(0, $customer->total_orders - 1);
        $customer->save();
    }

    public function searchForSelect(string $keyword, int $limit = 20): \Illuminate\Database\Eloquent\Collection
    {
        $q = Customer::where('status', Customer::STATUS_ACTIVE);
        if (trim($keyword) !== '') {
            $kw = trim($keyword);
            $q->where(function ($sub) use ($kw) {
                $sub->where('name', 'like', '%' . $kw . '%')
                    ->orWhere('phone', 'like', '%' . $kw . '%');
            });
        }
        return $q->orderBy('id', 'desc')->limit($limit)->get(['id', 'name', 'phone', 'level']);
    }
}
