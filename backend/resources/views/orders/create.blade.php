@extends('layouts.app')
@section('title', '创建订单')
@section('content')
<h1 class="text-xl font-bold mb-4">创建订单</h1>
<form action="{{ route('orders.store') }}" method="POST" class="bg-white rounded-xl shadow p-6 max-w-2xl" id="order-form">
    @csrf
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700">选择商品与数量</label>
            <div class="mt-2 space-y-2">
                @foreach($products as $p)
                <div class="flex items-center gap-4 item-row">
                    <span class="flex-1">{{ $p->name }}</span>
                    <span class="text-primary font-medium">¥{{ number_format($p->price, 2) }}</span>
                    <span class="text-gray-500 text-sm">库存 {{ $p->stock }}</span>
                    <input type="hidden" name="items[{{ $loop->index }}][product_id]" value="{{ $p->id }}" class="item-pid" />
                    <input type="number" name="items[{{ $loop->index }}][quantity]" min="0" value="0" class="item-qty w-20 rounded border-gray-300" />
                </div>
                @endforeach
            </div>
            <p class="text-gray-500 text-sm mt-2">填写数量，数量为 0 的将忽略。</p>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">备注</label>
            <input type="text" name="remark" value="{{ old('remark') }}" class="mt-1 block w-full rounded-lg border-gray-300" />
        </div>
    </div>
    <div class="mt-6 flex gap-2">
        <button type="submit" class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg">提交订单</button>
        <a href="{{ route('orders.index') }}" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg">取消</a>
    </div>
</form>
<script>
document.getElementById('order-form').addEventListener('submit', function(e) {
    var rows = document.querySelectorAll('.item-row');
    var idx = 0;
    rows.forEach(function(row) {
        var qtyInp = row.querySelector('.item-qty');
        var pidInp = row.querySelector('.item-pid');
        var qty = parseInt(qtyInp.value, 10) || 0;
        if (qty > 0) {
            pidInp.name = 'items[' + idx + '][product_id]';
            qtyInp.name = 'items[' + idx + '][quantity]';
            idx++;
        } else {
            pidInp.removeAttribute('name');
            qtyInp.removeAttribute('name');
        }
    });
    if (idx === 0) {
        e.preventDefault();
        alert('请至少填写一件商品的数量');
    }
});
</script>
@endsection
