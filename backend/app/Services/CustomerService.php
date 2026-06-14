<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;
use App\Support\BcMath;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class CustomerService
{
    public function list(int $perPage = 15, array $options = []): LengthAwarePaginator
    {
        $q = Customer::query();
        $filters = $options['filters'] ?? [];
        $sort = $options['sort'] ?? 'id_desc';

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

        switch ($sort) {
            case 'total_spent_desc':
                $q->orderByRaw('CAST(total_spent AS DECIMAL(12,2)) DESC')->orderBy('id', 'desc');
                break;
            case 'total_spent_asc':
                $q->orderByRaw('CAST(total_spent AS DECIMAL(12,2)) ASC')->orderBy('id', 'desc');
                break;
            case 'total_orders_desc':
                $q->orderBy('total_orders', 'desc')->orderBy('id', 'desc');
                break;
            case 'total_orders_asc':
                $q->orderBy('total_orders', 'asc')->orderBy('id', 'desc');
                break;
            case 'id_asc':
                $q->orderBy('id', 'asc');
                break;
            case 'id_desc':
            default:
                $q->orderBy('id', 'desc');
                break;
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
        $customer->total_spent = BcMath::add((string) $customer->total_spent, $amount, 2);
        $customer->total_orders = $customer->total_orders + 1;
        $customer->save();
    }

    public function subtractOrderStats(Customer $customer, string $amount): void
    {
        $customer->total_spent = BcMath::sub((string) $customer->total_spent, $amount, 2);
        if (BcMath::comp((string) $customer->total_spent, '0.00', 2) < 0) {
            $customer->total_spent = '0.00';
        }
        $customer->total_orders = max(0, $customer->total_orders - 1);
        $customer->save();
    }

    public function subtractSpentOnly(Customer $customer, string $amount): void
    {
        $customer->total_spent = BcMath::sub((string) $customer->total_spent, $amount, 2);
        if (BcMath::comp((string) $customer->total_spent, '0.00', 2) < 0) {
            $customer->total_spent = '0.00';
        }
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
