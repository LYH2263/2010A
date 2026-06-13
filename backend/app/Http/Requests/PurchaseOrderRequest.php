<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'remark' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.product_sku_id' => ['nullable', 'integer', 'exists:product_skus,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0', 'regex:/^\d+(\.\d{1,2})?$/'],
        ];
    }

    public function attributes(): array
    {
        return [
            'supplier_id' => '供应商',
            'remark' => '备注',
            'items' => '采购明细',
            'items.*.product_id' => '商品',
            'items.*.product_sku_id' => 'SKU',
            'items.*.quantity' => '采购数量',
            'items.*.unit_price' => '采购单价',
        ];
    }

    public function messages(): array
    {
        return [
            'items.*.unit_price.regex' => '采购单价最多保留2位小数',
        ];
    }
}
