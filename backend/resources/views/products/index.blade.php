@extends('layouts.app')
@section('title', '商品列表')
@section('content')
<div class="flex justify-between items-center mb-4">
    <h1 class="text-xl font-bold">商品列表</h1>
    <a href="{{ route('products.create') }}" class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg">新增商品</a>
</div>
<div class="bg-white rounded-xl shadow overflow-hidden">
    <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-primary-light">
            <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">名称</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">分类</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">单价</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">库存</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
            @foreach($products as $p)
            <tr class="hover:bg-orange-50">
                <td class="px-4 py-3 text-sm">{{ $p->id }}</td>
                <td class="px-4 py-3 text-sm font-medium">{{ $p->name }}</td>
                <td class="px-4 py-3 text-sm">{{ $p->sku }}</td>
                <td class="px-4 py-3 text-sm">{{ $p->category?->name ?? '-' }}</td>
                <td class="px-4 py-3 text-sm text-primary font-medium">¥{{ number_format($p->price, 2) }}</td>
                <td class="px-4 py-3 text-sm">{{ $p->stock }}</td>
                <td class="px-4 py-3 text-sm">{{ $p->status ? '上架' : '下架' }}</td>
                <td class="px-4 py-3 text-sm">
                    <a href="{{ route('products.show', $p) }}" class="text-primary hover:underline">详情</a>
                    <a href="{{ route('products.edit', $p) }}" class="text-primary hover:underline ml-2">编辑</a>
                    <form action="{{ route('products.destroy', $p) }}" method="POST" class="inline" onsubmit="return confirm('确定删除？');">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="text-red-600 hover:underline ml-2">删除</button>
                    </form>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
    <div class="px-4 py-3 border-t">{{ $products->links() }}</div>
</div>
@endsection
