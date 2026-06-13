<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'name' => ['required', 'string', 'max:64'],
            'phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^1[3-9]\d{9}$/',
                'unique:customers,phone,' . ($id ?? 'NULL'),
            ],
            'email' => ['nullable', 'string', 'email', 'max:128'],
            'level' => ['nullable', 'string', 'in:normal,silver,gold,diamond'],
            'remark' => ['nullable', 'string', 'max:500'],
            'status' => ['required', 'integer', 'in:0,1'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => '姓名',
            'phone' => '手机号',
            'email' => '邮箱',
            'level' => '等级',
            'remark' => '备注',
            'status' => '状态',
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => '手机号格式不正确，请输入11位手机号',
        ];
    }
}
