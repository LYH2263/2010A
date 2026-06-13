@extends('layouts.app')
@section('title', '新增商品')
@section('content')
<h1 class="text-xl font-bold mb-4">新增商品</h1>
<form action="{{ route('products.store') }}" method="POST" class="bg-white rounded-xl shadow p-6 max-w-xl">
    @csrf
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700">分类</label>
            <select name="category_id" class="mt-1 block w-full rounded-lg border-gray-300">
                <option value="">-- 请选择 --</option>
                @foreach($categories as $c)
                    <option value="{{ $c->id }}" {{ old('category_id') == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                @endforeach
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">商品名称 *</label>
            <input type="text" name="name" value="{{ old('name') }}" required class="mt-1 block w-full rounded-lg border-gray-300" />
            @error('name')<p class="text-red-500 text-sm mt-1">{{ $message }}</p>@enderror
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">SKU *</label>
            <input type="text" name="sku" value="{{ old('sku') }}" required class="mt-1 block w-full rounded-lg border-gray-300" />
            @error('sku')<p class="text-red-500 text-sm mt-1">{{ $message }}</p>@enderror
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">单价 *</label>
            <input type="number" name="price" step="0.01" value="{{ old('price') }}" required class="mt-1 block w-full rounded-lg border-gray-300" />
            @error('price')<p class="text-red-500 text-sm mt-1">{{ $message }}</p>@enderror
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">库存</label>
            <input type="number" name="stock" value="{{ old('stock', 0) }}" min="0" class="mt-1 block w-full rounded-lg border-gray-300" />
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">状态</label>
            <select name="status" class="mt-1 block w-full rounded-lg border-gray-300">
                <option value="1" {{ old('status', '1') == '1' ? 'selected' : '' }}>上架</option>
                <option value="0" {{ old('status') === '0' ? 'selected' : '' }}>下架</option>
            </select>
        </div>
    </div>
    <div class="mt-6 flex gap-2">
        <button type="submit" class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg">保存</button>
        <a href="{{ route('products.index') }}" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg">取消</a>
    </div>
</form>
@endsection
