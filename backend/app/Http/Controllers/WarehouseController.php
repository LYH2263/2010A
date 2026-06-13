<?php

namespace App\Http\Controllers;

use App\Http\Requests\WarehouseRequest;
use App\Services\WarehouseService;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class WarehouseController extends Controller
{
    public function __construct(
        private WarehouseService $warehouseService
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

        $warehouses = $this->warehouseService->list($perPage, ['filters' => $filters]);
        $warehouses->getCollection()->each(function ($w) {
            $stats = $this->warehouseService->stats($w->id);
            $w->stats = $stats;
        });

        return response()->json($warehouses);
    }

    public function allActive(Request $request): JsonResponse
    {
        $warehouses = $this->warehouseService->allActive();
        return response()->json($warehouses);
    }

    public function create(Request $request): JsonResponse
    {
        return response()->json([
            'warehouses' => $this->warehouseService->allForSelect(),
        ]);
    }

    public function store(WarehouseRequest $request): JsonResponse
    {
        try {
            $warehouse = $this->warehouseService->create($request->validated());
            return response()->json($warehouse->fresh(), 201);
        } catch (\Throwable $e) {
            Log::error('WarehouseController@store', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $warehouse = $this->warehouseService->find($id);
        if (!$warehouse) {
            return response()->json(['message' => '仓库不存在'], 404);
        }
        $stats = $this->warehouseService->stats($id);
        $warehouse->stats = $stats;
        return response()->json($warehouse);
    }

    public function edit(Request $request, int $id): JsonResponse
    {
        $warehouse = $this->warehouseService->find($id);
        if (!$warehouse) {
            return response()->json(['message' => '仓库不存在'], 404);
        }
        return response()->json([
            'warehouse' => $warehouse,
            'warehouses' => $this->warehouseService->allForSelect(),
        ]);
    }

    public function update(WarehouseRequest $request, Warehouse $warehouse): JsonResponse
    {
        try {
            $this->warehouseService->update($warehouse, $request->validated());
            return response()->json($warehouse->fresh());
        } catch (\Throwable $e) {
            Log::error('WarehouseController@update', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function destroy(Warehouse $warehouse): JsonResponse
    {
        try {
            $this->warehouseService->delete($warehouse);
            return response()->json(null, 204);
        } catch (\Throwable $e) {
            Log::error('WarehouseController@destroy', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
