<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id'); // 编辑时路由为 categories/{id}
        return [
            'name' => ['required', 'string', 'max:64'],
            'slug' => ['nullable', 'string', 'max:64', 'unique:categories,slug,' . ($id ?? 'NULL')],
            'sort_order' => ['nullable', 'integer'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => '分类名称',
            'slug' => '标识',
            'sort_order' => '排序',
        ];
    }
}
