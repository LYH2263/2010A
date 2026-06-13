<?php

namespace App\Http\Controllers;

use App\Http\Requests\InventoryAdjustRequest;
use App\Services\InventoryService;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class InventoryController extends Controller
{
    public function __construct(
        private InventoryService $inventoryService
    ) {}

    public function index(Request $request): JsonResponse|\Illuminate\View\View
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $filters = [];
        $keyword = $request->query('keyword');
        if (is_string($keyword) && trim($keyword) !== '') {
            $filters['keyword'] = trim($keyword);
        }
        $categoryId = $request->query('category_id');
        if ($categoryId !== null && $categoryId !== '') {
            $filters['category_id'] = (int) $categoryId;
        }
        if ($request->query('low_stock') === '1' || $request->query('low_stock') === 'true') {
            $filters['low_stock'] = true;
        }
        $products = $this->inventoryService->list($perPage, ['filters' => $filters]);
        $stats = $this->inventoryService->stats();
        if ($request->expectsJson()) {
            return response()->json([
                'products' => $products,
                'stats' => $stats,
            ]);
        }
        return view('inventory.index', ['products' => $products, 'stats' => $stats]);
    }

    public function movements(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $filters = [];

        $productId = $request->query('product_id');
        if ($productId !== null && $productId !== '') {
            $filters['product_id'] = (int) $productId;
        }

        $sourceType = $request->query('source_type');
        if (is_string($sourceType) && trim($sourceType) !== '') {
            $filters['source_type'] = trim($sourceType);
        }

        $dateFrom = $request->query('date_from');
        if (is_string($dateFrom) && trim($dateFrom) !== '') {
            $filters['date_from'] = trim($dateFrom);
        }

        $dateTo = $request->query('date_to');
        if (is_string($dateTo) && trim($dateTo) !== '') {
            $filters['date_to'] = trim($dateTo);
        }

        $keyword = $request->query('keyword');
        if (is_string($keyword) && trim($keyword) !== '') {
            $filters['keyword'] = trim($keyword);
        }

        $movements = $this->inventoryService->listMovements($perPage, ['filters' => $filters]);

        $movements->getCollection()->each(function ($m) {
            $m->setAppends(['source_type_label']);
        });

        return response()->json([
            'movements' => $movements,
            'source_types' => StockMovement::$sourceTypeLabels,
        ]);
    }

    public function adjust(Request $request, \App\Models\Product $product): JsonResponse|\Illuminate\View\View
    {
        if ($request->expectsJson()) {
            return response()->json($product->load('category'));
        }
        return view('inventory.adjust', ['product' => $product]);
    }

    public function doAdjust(InventoryAdjustRequest $request, \App\Models\Product $product): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        try {
            $delta = (int) $request->input('delta');
            $reason = $request->input('reason') ?? '';
            $this->inventoryService->adjust($product, $delta, (string) $reason);
            if ($request->expectsJson()) {
                return response()->json($product->fresh());
            }
            return redirect()->route('inventory.index')->with('success', '库存已调整');
        } catch (\Throwable $e) {
            Log::error('InventoryController@doAdjust', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->withInput()->with('error', $e->getMessage());
        }
    }
}
