<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id'); // 编辑时路由为 products/{id}
        return [
            'category_id' => ['nullable', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:128'],
            'sku' => ['required', 'string', 'max:64', 'unique:products,sku,' . ($id ?? 'NULL')],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'in:0,1'],
        ];
    }

    public function attributes(): array
    {
        return [
            'category_id' => '分类',
            'name' => '商品名称',
            'sku' => '商品编码',
            'price' => '单价',
            'stock' => '库存',
            'status' => '状态',
        ];
    }
}
