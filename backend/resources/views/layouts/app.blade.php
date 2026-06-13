<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', '商品管理系统')</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#FF6A00',
                        'primary-light': '#FFE5D6',
                        'primary-hover': '#FF8533',
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-100 text-gray-800">
    <nav class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-14">
                <div class="flex items-center">
                    <a href="{{ url('/') }}" class="text-primary font-bold text-xl">商品管理系统</a>
                    <div class="ml-8 flex gap-4">
                        <a href="{{ route('dashboard') }}" class="text-gray-600 hover:text-primary">仪表盘</a>
                        <a href="{{ route('products.index') }}" class="text-gray-600 hover:text-primary">商品</a>
                        <a href="{{ route('categories.index') }}" class="text-gray-600 hover:text-primary">分类</a>
                        <a href="{{ route('orders.index') }}" class="text-gray-600 hover:text-primary">订单</a>
                        <a href="{{ route('inventory.index') }}" class="text-gray-600 hover:text-primary">库存</a>
                    </div>
                </div>
            </div>
        </div>
    </nav>
    <main class="max-w-7xl mx-auto px-4 py-6">
        @if(session('success'))
            <div class="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">{{ session('success') }}</div>
        @endif
        @if(session('error'))
            <div class="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">{{ session('error') }}</div>
        @endif
        @yield('content')
    </main>
</body>
</html>
