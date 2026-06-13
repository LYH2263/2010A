<?php

namespace App\Http\Controllers;

use App\Http\Requests\SupplierRequest;
use App\Services\SupplierService;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SupplierController extends Controller
{
    public function __construct(
        private SupplierService $supplierService
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

        $suppliers = $this->supplierService->list($perPage, ['filters' => $filters]);

        $suppliers->getCollection()->each(function ($s) {
            $s->setAppends(['status_label']);
        });

        return response()->json([
            'suppliers' => $suppliers,
            'status_labels' => Supplier::$statusLabels,
        ]);
    }

    public function create(Request $request): JsonResponse
    {
        return response()->json([
            'status_labels' => Supplier::$statusLabels,
        ]);
    }

    public function store(SupplierRequest $request): JsonResponse
    {
        $supplier = $this->supplierService->create($request->validated());
        return response()->json($supplier, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $supplier = Supplier::find($id);
        if (!$supplier) {
            return response()->json(['message' => '供应商不存在'], 404);
        }
        return response()->json($supplier->setAppends(['status_label']));
    }

    public function edit(Request $request, int $id): JsonResponse
    {
        $supplier = Supplier::find($id);
        if (!$supplier) {
            return response()->json(['message' => '供应商不存在'], 404);
        }
        return response()->json([
            'supplier' => $supplier,
            'status_labels' => Supplier::$statusLabels,
        ]);
    }

    public function update(SupplierRequest $request, int $id): JsonResponse
    {
        $supplier = Supplier::find($id);
        if (!$supplier) {
            return response()->json(['message' => '供应商不存在'], 404);
        }
        $supplier = $this->supplierService->update($supplier, $request->validated());
        return response()->json($supplier->setAppends(['status_label']));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $supplier = Supplier::find($id);
        if (!$supplier) {
            return response()->json(['message' => '供应商不存在'], 404);
        }
        try {
            $this->supplierService->delete($supplier);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        return response()->json(null, 204);
    }

    public function allActive(Request $request): JsonResponse
    {
        $list = $this->supplierService->allActiveForSelect();
        return response()->json($list);
    }
}
