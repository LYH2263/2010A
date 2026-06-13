@extends('layouts.app')
@section('title', '订单详情')
@section('content')
<div class="flex justify-between items-center mb-4">
    <h1 class="text-xl font-bold">订单详情</h1>
    <a href="{{ route('orders.index') }}" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg">返回列表</a>
</div>
<div class="bg-white rounded-xl shadow p-6 max-w-2xl mb-4">
    <dl class="grid grid-cols-2 gap-4">
        <div><dt class="text-gray-500 text-sm">订单号</dt><dd class="font-medium">{{ $order->order_no }}</dd></div>
        <div><dt class="text-gray-500 text-sm">状态</dt><dd>{{ $order->status }}</dd></div>
        <div><dt class="text-gray-500 text-sm">总金额</dt><dd class="text-primary font-medium">¥{{ number_format($order->total_amount, 2) }}</dd></div>
        <div><dt class="text-gray-500 text-sm">创建时间</dt><dd>{{ $order->created_at->format('Y-m-d H:i:s') }}</dd></div>
    </dl>
</div>
<div class="bg-white rounded-xl shadow overflow-hidden mb-4">
    <h2 class="px-4 py-3 bg-primary-light font-medium">订单明细</h2>
    <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">商品</th>
                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">单价</th>
                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">数量</th>
                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">小计</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->items as $item)
            <tr class="border-t">
                <td class="px-4 py-2 text-sm">{{ $item->product_name }}</td>
                <td class="px-4 py-2 text-sm">¥{{ number_format($item->price, 2) }}</td>
                <td class="px-4 py-2 text-sm">{{ $item->quantity }}</td>
                <td class="px-4 py-2 text-sm text-primary font-medium">¥{{ number_format($item->subtotal, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
<form action="{{ route('orders.updateStatus', $order) }}" method="POST" class="flex gap-2">
    @csrf
    @method('PATCH')
    <input type="hidden" name="status" value="paid" />
    <button type="submit" class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg">标记已付款</button>
</form>
<form action="{{ route('orders.updateStatus', $order) }}" method="POST" class="inline ml-2">
    @csrf
    @method('PATCH')
    <input type="hidden" name="status" value="shipped" />
    <button type="submit" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg">标记已发货</button>
</form>
<form action="{{ route('orders.updateStatus', $order) }}" method="POST" class="inline ml-2" onsubmit="return confirm('确定取消？将退回库存');">
    @csrf
    @method('PATCH')
    <input type="hidden" name="status" value="cancelled" />
    <button type="submit" class="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg">取消订单</button>
</form>
@endsection
