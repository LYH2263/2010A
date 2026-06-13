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
        $id = $this->route('id');
        return [
            'category_id' => ['nullable', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:128'],
            'sku' => ['required', 'string', 'max:64', 'unique:products,sku,' . ($id ?? 'NULL')],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'in:0,1'],
            'alert_threshold' => ['nullable', 'integer', 'min:0'],
            'specs' => ['nullable', 'array', 'min:0'],
            'specs.*.name' => ['required_with:specs', 'string', 'max:64'],
            'specs.*.values' => ['required_with:specs', 'array', 'min:1'],
            'specs.*.values.*' => ['required_with:specs', 'string', 'max:64'],
            'skus' => ['nullable', 'array', 'min:1'],
            'skus.*.sku' => ['required_with:skus', 'string', 'max:64'],
            'skus.*.price' => ['required_with:skus', 'numeric', 'min:0'],
            'skus.*.stock' => ['required_with:skus', 'integer', 'min:0'],
            'skus.*.alert_threshold' => ['nullable', 'integer', 'min:0'],
            'skus.*.spec_values' => ['nullable', 'array'],
            'images' => ['nullable', 'array', 'max:20'],
            'images.*.id' => ['required_with:images', 'integer', 'exists:product_images,id'],
            'images.*.is_main' => ['nullable', 'boolean'],
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
