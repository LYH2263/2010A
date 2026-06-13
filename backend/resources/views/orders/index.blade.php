@extends('layouts.app')
@section('title', '订单列表')
@section('content')
<div class="flex justify-between items-center mb-4">
    <h1 class="text-xl font-bold">订单列表</h1>
    <a href="{{ route('orders.create') }}" class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg">创建订单</a>
</div>
<div class="bg-white rounded-xl shadow overflow-hidden">
    <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-primary-light">
            <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">订单号</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">金额</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">创建时间</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
            @foreach($orders as $o)
            <tr class="hover:bg-orange-50">
                <td class="px-4 py-3 text-sm font-medium">{{ $o->order_no }}</td>
                <td class="px-4 py-3 text-sm">{{ $o->status }}</td>
                <td class="px-4 py-3 text-sm text-primary font-medium">¥{{ number_format($o->total_amount, 2) }}</td>
                <td class="px-4 py-3 text-sm">{{ $o->created_at->format('Y-m-d H:i') }}</td>
                <td class="px-4 py-3 text-sm">
                    <a href="{{ route('orders.show', $o) }}" class="text-primary hover:underline">详情</a>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
    <div class="px-4 py-3 border-t">{{ $orders->links() }}</div>
</div>
@endsection
