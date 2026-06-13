<?php

namespace App\Http\Controllers;

use App\Http\Requests\CustomerRequest;
use App\Services\CustomerService;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CustomerController extends Controller
{
    public function __construct(
        private CustomerService $customerService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $filters = [];

        $keyword = $request->query('keyword');
        if (is_string($keyword) && trim($keyword) !== '') {
            $filters['keyword'] = trim($keyword);
        }

        $status = $request->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = (int) $status;
        }

        $level = $request->query('level');
        if (is_string($level) && trim($level) !== '') {
            $filters['level'] = trim($level);
        }

        $customers = $this->customerService->list($perPage, ['filters' => $filters]);

        $customers->getCollection()->each(function ($c) {
            $c->setAppends(['status_label', 'level_label']);
        });

        return response()->json([
            'customers' => $customers,
            'status_labels' => Customer::$statusLabels,
            'level_labels' => Customer::$levelLabels,
        ]);
    }

    public function create(Request $request): JsonResponse
    {
        return response()->json([
            'status_labels' => Customer::$statusLabels,
            'level_labels' => Customer::$levelLabels,
        ]);
    }

    public function store(CustomerRequest $request): JsonResponse
    {
        $customer = $this->customerService->create($request->validated());
        return response()->json($customer->setAppends(['status_label', 'level_label']), 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $withOrders = $request->query('with_orders', '0');
        if ($withOrders === '1') {
            $customer = $this->customerService->findWithOrders($id);
        } else {
            $customer = $this->customerService->find($id);
        }

        if (!$customer) {
            return response()->json(['message' => '客户不存在'], 404);
        }
        return response()->json($customer->setAppends(['status_label', 'level_label']));
    }

    public function edit(Request $request, int $id): JsonResponse
    {
        $customer = Customer::find($id);
        if (!$customer) {
            return response()->json(['message' => '客户不存在'], 404);
        }
        return response()->json([
            'customer' => $customer,
            'status_labels' => Customer::$statusLabels,
            'level_labels' => Customer::$levelLabels,
        ]);
    }

    public function update(CustomerRequest $request, int $id): JsonResponse
    {
        $customer = Customer::find($id);
        if (!$customer) {
            return response()->json(['message' => '客户不存在'], 404);
        }
        $customer = $this->customerService->update($customer, $request->validated());
        return response()->json($customer->setAppends(['status_label', 'level_label']));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $customer = Customer::find($id);
        if (!$customer) {
            return response()->json(['message' => '客户不存在'], 404);
        }
        try {
            $this->customerService->delete($customer);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        return response()->json(null, 204);
    }

    public function search(Request $request): JsonResponse
    {
        $keyword = $request->query('keyword', '');
        $limit = min((int) $request->query('limit', 20), 50);
        $list = $this->customerService->searchForSelect($keyword, $limit);
        return response()->json($list);
    }
}
