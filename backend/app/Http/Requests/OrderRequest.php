<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'remark' => ['nullable', 'string', 'max:255'],
            'coupon_code' => ['nullable', 'string', 'max:64'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.product_sku_id' => ['nullable', 'exists:product_skus,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ];
    }

    public function attributes(): array
    {
        return [
            'remark' => '备注',
            'coupon_code' => '优惠券码',
            'customer_id' => '客户',
            'items' => '订单项',
        ];
    }
}
