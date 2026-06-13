@extends('layouts.app')
@section('title', '分类列表')
@section('content')
<div class="flex justify-between items-center mb-4">
    <h1 class="text-xl font-bold">分类列表</h1>
    <a href="{{ route('categories.create') }}" class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg">新增分类</a>
</div>
<div class="bg-white rounded-xl shadow overflow-hidden">
    <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-primary-light">
            <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">名称</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">标识</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">排序</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
            @foreach($categories as $c)
            <tr class="hover:bg-orange-50">
                <td class="px-4 py-3 text-sm">{{ $c->id }}</td>
                <td class="px-4 py-3 text-sm font-medium">{{ $c->name }}</td>
                <td class="px-4 py-3 text-sm">{{ $c->slug ?? '-' }}</td>
                <td class="px-4 py-3 text-sm">{{ $c->sort_order }}</td>
                <td class="px-4 py-3 text-sm">
                    <a href="{{ route('categories.edit', $c) }}" class="text-primary hover:underline">编辑</a>
                    <form action="{{ route('categories.destroy', $c) }}" method="POST" class="inline" onsubmit="return confirm('确定删除？');">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="text-red-600 hover:underline ml-2">删除</button>
                    </form>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
    <div class="px-4 py-3 border-t">{{ $categories->links() }}</div>
</div>
@endsection
