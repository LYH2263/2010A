<?php

namespace App\Http\Controllers;

use App\Http\Requests\CategoryRequest;
use App\Services\CategoryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function __construct(
        private CategoryService $categoryService
    ) {}

    public function index(Request $request): JsonResponse|\Illuminate\View\View
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $categories = $this->categoryService->list($perPage);
        if ($request->expectsJson()) {
            return response()->json($categories);
        }
        return view('categories.index', ['categories' => $categories]);
    }

    public function create(Request $request): \Illuminate\View\View|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json([]);
        }
        return view('categories.create');
    }

    public function store(CategoryRequest $request): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $category = $this->categoryService->create($request->validated());
        if ($request->expectsJson()) {
            return response()->json($category, 201);
        }
        return redirect()->route('categories.index')->with('success', '分类已创建');
    }

    public function edit(Request $request, int $id): JsonResponse|\Illuminate\View\View
    {
        $category = \App\Models\Category::find($id);
        if (!$category) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '分类不存在'], 404);
            }
            abort(404);
        }
        if ($request->expectsJson()) {
            return response()->json($category);
        }
        return view('categories.edit', ['category' => $category]);
    }

    public function update(CategoryRequest $request, int $id): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $category = \App\Models\Category::find($id);
        if (!$category) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '分类不存在'], 404);
            }
            abort(404);
        }
        $this->categoryService->update($category, $request->validated());
        if ($request->expectsJson()) {
            return response()->json($category->fresh());
        }
        return redirect()->route('categories.index')->with('success', '已更新');
    }

    public function destroy(Request $request, int $id): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $category = \App\Models\Category::find($id);
        if (!$category) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '分类不存在'], 404);
            }
            abort(404);
        }
        try {
            $this->categoryService->delete($category);
        } catch (\InvalidArgumentException $e) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return redirect()->route('categories.index')->with('error', $e->getMessage());
        }
        if ($request->expectsJson()) {
            return response()->json(null, 204);
        }
        return redirect()->route('categories.index')->with('success', '已删除');
    }
}
