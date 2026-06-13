@extends('layouts.app')
@section('title', '新增分类')
@section('content')
<h1 class="text-xl font-bold mb-4">新增分类</h1>
<form action="{{ route('categories.store') }}" method="POST" class="bg-white rounded-xl shadow p-6 max-w-xl">
    @csrf
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700">名称 *</label>
            <input type="text" name="name" value="{{ old('name') }}" required class="mt-1 block w-full rounded-lg border-gray-300" />
            @error('name')<p class="text-red-500 text-sm mt-1">{{ $message }}</p>@enderror
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">标识 (slug)</label>
            <input type="text" name="slug" value="{{ old('slug') }}" class="mt-1 block w-full rounded-lg border-gray-300" placeholder="留空自动生成" />
            @error('slug')<p class="text-red-500 text-sm mt-1">{{ $message }}</p>@enderror
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">排序</label>
            <input type="number" name="sort_order" value="{{ old('sort_order', 0) }}" class="mt-1 block w-full rounded-lg border-gray-300" />
        </div>
    </div>
    <div class="mt-6 flex gap-2">
        <button type="submit" class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg">保存</button>
        <a href="{{ route('categories.index') }}" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg">取消</a>
    </div>
</form>
@endsection
