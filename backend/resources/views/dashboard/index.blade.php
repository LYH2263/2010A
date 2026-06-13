@extends('layouts.app')
@section('title', '仪表盘')
@section('content')
<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="bg-white rounded-xl shadow p-6 border border-gray-100">
        <p class="text-gray-500 text-sm">商品总数</p>
        <p class="text-2xl font-bold text-primary mt-1">{{ $productCount }}</p>
    </div>
    <div class="bg-white rounded-xl shadow p-6 border border-gray-100">
        <p class="text-gray-500 text-sm">订单总数</p>
        <p class="text-2xl font-bold text-primary mt-1">{{ $orderCount }}</p>
    </div>
    <div class="bg-white rounded-xl shadow p-6 border border-gray-100">
        <p class="text-gray-500 text-sm">库存总量</p>
        <p class="text-2xl font-bold text-primary mt-1">{{ $totalStock }}</p>
    </div>
    <div class="bg-white rounded-xl shadow p-6 border border-gray-100">
        <p class="text-gray-500 text-sm">已收款金额</p>
        <p class="text-2xl font-bold text-primary mt-1">¥{{ number_format($totalAmount, 2) }}</p>
    </div>
</div>
@endsection
