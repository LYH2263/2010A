@extends('layouts.app')
@section('title', '库存管理')
@section('content')
<div class="mb-4 flex justify-between items-center">
    <h1 class="text-xl font-bold">库存管理</h1>
</div>
<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div class="bg-white rounded-xl shadow p-4 border border-gray-100">
        <p class="text-gray-500 text-sm">库存总量</p>
        <p class="text-2xl font-bold text-primary">{{ $stats['total_stock'] }}</p>
    </div>
    <div class="bg-white rounded-xl shadow p-4 border border-gray-100">
        <p class="text-gray-500 text-sm">库存总价值</p>
        <p class="text-2xl font-bold text-primary">¥{{ number_format($stats['total_value'], 2) }}</p>
    </div>
    <div class="bg-white rounded-xl shadow p-4 border border-gray-100">
        <p class="text-gray-500 text-sm">低库存商品数 (≤10)</p>
        <p class="text-2xl font-bold {{ $stats['low_stock_count'] > 0 ? 'text-orange-600' : 'text-green-600' }}">{{ $stats['low_stock_count'] }}</p>
    </div>
</div>
<div class="bg-white rounded-xl shadow overflow-hidden">
    <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-primary-light">
            <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">商品</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">当前库存</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
            @foreach($products as $p)
            <tr class="hover:bg-orange-50">
                <td class="px-4 py-3 text-sm">{{ $p->id }}</td>
                <td class="px-4 py-3 text-sm font-medium">{{ $p->name }}</td>
                <td class="px-4 py-3 text-sm">{{ $p->sku }}</td>
                <td class="px-4 py-3 text-sm {{ $p->stock <= 10 ? 'text-orange-600 font-medium' : '' }}">{{ $p->stock }}</td>
                <td class="px-4 py-3 text-sm">
                    <a href="{{ route('inventory.adjust', $p) }}" class="text-primary hover:underline">调整库存</a>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
    <div class="px-4 py-3 border-t">{{ $products->links() }}</div>
</div>
@endsection
