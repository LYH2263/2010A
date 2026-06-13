<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Services\ProductService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
{
    public function __construct(
        private ProductService $productService
    ) {}

    public function index(Request $request): JsonResponse|\Illuminate\View\View
    {
        $categoryId = $request->query('category_id') ? (int) $request->query('category_id') : null;
        $perPage = min((int) $request->query('per_page', 15), 50);
        $filters = [];
        $keyword = $request->query('keyword');
        if (is_string($keyword) && trim($keyword) !== '') {
            $filters['keyword'] = trim($keyword);
        }
        $products = $this->productService->list($categoryId, $perPage, ['filters' => $filters]);

        if ($request->expectsJson()) {
            return response()->json($products);
        }
        return view('products.index', ['products' => $products]);
    }

    public function create(Request $request): \Illuminate\View\View|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json(['categories' => (new \App\Services\CategoryService())->allForSelect()]);
        }
        return view('products.create', ['categories' => (new \App\Services\CategoryService())->allForSelect()]);
    }

    public function store(ProductRequest $request): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        try {
            $product = $this->productService->create($request->validated());
            if ($request->expectsJson()) {
                return response()->json($product->load('category'), 201);
            }
            return redirect()->route('products.show', $product)->with('success', '商品已创建');
        } catch (\Throwable $e) {
            Log::error('ProductController@store', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->withInput()->with('error', $e->getMessage());
        }
    }

    public function show(Request $request, int $id): JsonResponse|\Illuminate\View\View
    {
        $product = $this->productService->find($id);
        if (!$product) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '商品不存在'], 404);
            }
            abort(404);
        }
        if ($request->expectsJson()) {
            return response()->json($product);
        }
        return view('products.show', ['product' => $product]);
    }

    public function edit(Request $request, int $id): JsonResponse|\Illuminate\View\View
    {
        $product = $this->productService->find($id);
        if (!$product) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '商品不存在'], 404);
            }
            abort(404);
        }
        if ($request->expectsJson()) {
            return response()->json([
                'product' => $product,
                'categories' => (new \App\Services\CategoryService())->allForSelect(),
            ]);
        }
        return view('products.edit', [
            'product' => $product,
            'categories' => (new \App\Services\CategoryService())->allForSelect(),
        ]);
    }

    public function update(ProductRequest $request, int $id): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $product = $this->productService->find($id);
        if (!$product) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '商品不存在'], 404);
            }
            abort(404);
        }
        try {
            $this->productService->update($product, $request->validated());
            if ($request->expectsJson()) {
                return response()->json($product->fresh()->load('category'));
            }
            return redirect()->route('products.show', $product)->with('success', '已更新');
        } catch (\Throwable $e) {
            Log::error('ProductController@update', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->withInput()->with('error', $e->getMessage());
        }
    }

    public function destroy(Request $request, int $id): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $product = $this->productService->find($id);
        if (!$product) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '商品不存在'], 404);
            }
            abort(404);
        }
        $this->productService->delete($product);
        if ($request->expectsJson()) {
            return response()->json(null, 204);
        }
        return redirect()->route('products.index')->with('success', '已删除');
    }
}
