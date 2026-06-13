<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class WarehouseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:128',
            'code' => 'required|string|max:64|unique:warehouses,code,' . ($this->route('warehouse')?->id ?? 'NULL') . ',id',
            'address' => 'nullable|string|max:255',
            'status' => 'required|in:0,1',
            'is_default' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => '仓库名称不能为空',
            'name.max' => '仓库名称不能超过 128 个字符',
            'code.required' => '仓库编码不能为空',
            'code.max' => '仓库编码不能超过 64 个字符',
            'code.unique' => '仓库编码已存在',
            'address.max' => '仓库地址不能超过 255 个字符',
            'status.required' => '状态不能为空',
            'status.in' => '状态值无效',
            'is_default.boolean' => '默认仓库标识无效',
        ];
    }
}
