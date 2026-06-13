@extends('layouts.app')
@section('title', $product->name)
@section('content')
<div class="flex justify-between items-center mb-4">
    <h1 class="text-xl font-bold">商品详情</h1>
    <div>
        <a href="{{ route('products.edit', $product) }}" class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg">编辑</a>
        <a href="{{ route('products.index') }}" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg ml-2">返回列表</a>
    </div>
</div>
<div class="bg-white rounded-xl shadow p-6 max-w-2xl">
    <dl class="grid grid-cols-1 gap-4">
        <div><dt class="text-gray-500 text-sm">名称</dt><dd class="font-medium">{{ $product->name }}</dd></div>
        <div><dt class="text-gray-500 text-sm">SKU</dt><dd>{{ $product->sku }}</dd></div>
        <div><dt class="text-gray-500 text-sm">分类</dt><dd>{{ $product->category?->name ?? '-' }}</dd></div>
        <div><dt class="text-gray-500 text-sm">单价</dt><dd class="text-primary font-medium">¥{{ number_format($product->price, 2) }}</dd></div>
        <div><dt class="text-gray-500 text-sm">库存</dt><dd>{{ $product->stock }}</dd></div>
        <div><dt class="text-gray-500 text-sm">状态</dt><dd>{{ $product->status ? '上架' : '下架' }}</dd></div>
        @if($product->description)
        <div class="col-span-1"><dt class="text-gray-500 text-sm">描述</dt><dd>{{ $product->description }}</dd></div>
        @endif
    </dl>
</div>
@endsection
