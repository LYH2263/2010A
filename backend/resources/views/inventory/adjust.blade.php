@extends('layouts.app')
@section('title', '调整库存')
@section('content')
<h1 class="text-xl font-bold mb-4">调整库存：{{ $product->name }}</h1>
<div class="bg-white rounded-xl shadow p-6 max-w-xl mb-4">
    <p class="text-gray-600">当前库存：<span class="font-bold text-primary">{{ $product->stock }}</span></p>
</div>
<form action="{{ route('inventory.doAdjust', $product) }}" method="POST" class="bg-white rounded-xl shadow p-6 max-w-xl">
    @csrf
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700">调整数量 *</label>
            <input type="number" name="delta" value="{{ old('delta') }}" required class="mt-1 block w-full rounded-lg border-gray-300" placeholder="正数入库，负数出库" />
            @error('delta')<p class="text-red-500 text-sm mt-1">{{ $message }}</p>@enderror
            <p class="text-gray-500 text-sm mt-1">例如：+10 表示入库 10，-5 表示出库 5</p>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">原因</label>
            <input type="text" name="reason" value="{{ old('reason') }}" class="mt-1 block w-full rounded-lg border-gray-300" />
        </div>
    </div>
    <div class="mt-6 flex gap-2">
        <button type="submit" class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg">提交</button>
        <a href="{{ route('inventory.index') }}" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg">返回</a>
    </div>
</form>
@endsection
