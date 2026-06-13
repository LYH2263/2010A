<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Coupon;

class CouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isUpdate = $this->route('id') || $this->route('coupon');

        return [
            'code' => [
                $isUpdate ? 'nullable' : 'required',
                'string',
                'max:64',
                function ($attribute, $value, $fail) use ($isUpdate) {
                    $value = trim($value);
                    if ($value === '' && !$isUpdate) {
                        $fail('券码不能为空');
                        return;
                    }
                    if ($value === '') {
                        return;
                    }
                    $q = Coupon::where('code', $value);
                    if ($isUpdate) {
                        $id = $this->route('id') ?? ($this->route('coupon')->id ?? null);
                        if ($id) {
                            $q->where('id', '!=', $id);
                        }
                    }
                    if ($q->exists()) {
                        $fail('券码已存在');
                    }
                },
            ],
            'name' => ['required', 'string', 'max:128'],
            'type' => ['required', 'in:fixed,percent'],
            'value' => [
                'required',
                'numeric',
                'min:0',
                function ($attribute, $value, $fail) {
                    $type = $this->input('type');
                    if ($type === 'fixed' && (float) $value <= 0) {
                        $fail('满减券面额必须大于 0');
                    }
                    if ($type === 'percent') {
                        $v = (float) $value;
                        if ($v <= 0 || $v > 100) {
                            $fail('折扣率必须在 0~100 之间（不含 0）');
                        }
                    }
                },
            ],
            'min_amount' => ['nullable', 'numeric', 'min:0'],
            'valid_from' => ['required', 'date'],
            'valid_until' => [
                'required',
                'date',
                'after:valid_from',
            ],
            'total_quantity' => ['required', 'integer', 'min:1'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'status' => ['nullable', 'in:active,inactive'],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function attributes(): array
    {
        return [
            'code' => '券码',
            'name' => '券名称',
            'type' => '券类型',
            'value' => '面额/折扣率',
            'min_amount' => '使用门槛',
            'valid_from' => '有效期开始',
            'valid_until' => '有效期结束',
            'total_quantity' => '发行总量',
            'category_ids' => '适用分类',
            'status' => '状态',
            'description' => '描述',
        ];
    }
}
