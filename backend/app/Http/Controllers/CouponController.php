<?php

namespace App\Http\Controllers;

use App\Http\Requests\CouponRequest;
use App\Services\CouponService;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class CouponController extends Controller
{
    public function __construct(
        private CouponService $couponService
    ) {}

    public function index(Request $request): JsonResponse|\Illuminate\View\View
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $status = $request->query('status');
        if ($status !== null && $status !== '') {
            $status = in_array($status, [Coupon::STATUS_ACTIVE, Coupon::STATUS_INACTIVE], true) ? $status : null;
        }
        $coupons = $this->couponService->list($perPage, $status);
        if ($request->expectsJson()) {
            return response()->json($coupons);
        }
        return view('coupons.index', ['coupons' => $coupons]);
    }

    public function create(Request $request): \Illuminate\View\View|JsonResponse
    {
        $categories = \App\Models\Category::orderBy('sort_order')->orderBy('id')->get();
        if ($request->expectsJson()) {
            return response()->json(['categories' => $categories]);
        }
        return view('coupons.create', ['categories' => $categories]);
    }

    public function store(CouponRequest $request): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        try {
            $coupon = $this->couponService->create($request->validated());
            if ($request->expectsJson()) {
                return response()->json($coupon, 201);
            }
            return redirect()->route('coupons.index')->with('success', '优惠券已创建');
        } catch (\Throwable $e) {
            Log::error('CouponController@store', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->withInput()->with('error', $e->getMessage());
        }
    }

    public function edit(Request $request, int $id): JsonResponse|\Illuminate\View\View
    {
        $coupon = $this->couponService->find($id);
        if (!$coupon) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '优惠券不存在'], 404);
            }
            abort(404);
        }
        $categories = \App\Models\Category::orderBy('sort_order')->orderBy('id')->get();
        if ($request->expectsJson()) {
            return response()->json(['coupon' => $coupon, 'categories' => $categories]);
        }
        return view('coupons.edit', ['coupon' => $coupon, 'categories' => $categories]);
    }

    public function update(CouponRequest $request, int $id): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $coupon = $this->couponService->find($id);
        if (!$coupon) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '优惠券不存在'], 404);
            }
            abort(404);
        }
        try {
            $coupon = $this->couponService->update($coupon, $request->validated());
            if ($request->expectsJson()) {
                return response()->json($coupon);
            }
            return redirect()->route('coupons.index')->with('success', '优惠券已更新');
        } catch (\Throwable $e) {
            Log::error('CouponController@update', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->withInput()->with('error', $e->getMessage());
        }
    }

    public function toggleStatus(Request $request, int $id): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $coupon = $this->couponService->find($id);
        if (!$coupon) {
            if ($request->expectsJson()) {
                return response()->json(['message' => '优惠券不存在'], 404);
            }
            abort(404);
        }
        try {
            $coupon = $this->couponService->toggleStatus($coupon);
            if ($request->expectsJson()) {
                return response()->json($coupon);
            }
            return back()->with('success', '状态已更新');
        } catch (\Throwable $e) {
            Log::error('CouponController@toggleStatus', ['error' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->with('error', $e->getMessage());
        }
    }

    public function validateCoupon(Request $request): JsonResponse
    {
        $code = trim((string) $request->input('code', ''));
        $items = $request->input('items', []);
        if ($code === '') {
            return response()->json(['valid' => false, 'message' => '请输入券码']);
        }
        if (!is_array($items) || empty($items)) {
            return response()->json(['valid' => false, 'message' => '请先选择商品']);
        }
        $result = $this->couponService->validate($code, $items);
        return response()->json($result);
    }
}
