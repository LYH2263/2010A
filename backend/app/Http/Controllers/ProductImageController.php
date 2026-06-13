<?php

namespace App\Http\Controllers;

use App\Services\ProductImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class ProductImageController extends Controller
{
    public function __construct(
        private ProductImageService $imageService
    ) {}

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file'],
        ]);

        try {
            $file = $request->file('image');
            $sessionId = Session::getId();

            $image = $this->imageService->upload($file, $sessionId);

            return response()->json([
                'id' => $image->id,
                'url' => $image->url,
                'absolute_url' => $image->absolute_url,
                'path' => $image->path,
                'session_id' => $image->session_id,
                'sort' => $image->sort,
                'is_main' => $image->is_main,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => '上传失败：' . $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $sessionId = Session::getId();
        $image = \App\Models\ProductImage::where('id', $id)
            ->where(function ($q) use ($sessionId) {
                $q->where('session_id', $sessionId)->whereNull('product_id');
            })
            ->first();

        if (!$image) {
            return response()->json(['message' => '图片不存在或无权删除'], 404);
        }

        try {
            $image->deleteFile();
            $image->delete();
            return response()->json(null, 204);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => '删除失败'], 500);
        }
    }

    public function config(): JsonResponse
    {
        return response()->json([
            'max_images_per_product' => ProductImageService::MAX_IMAGES_PER_PRODUCT,
            'max_file_size_kb' => ProductImageService::MAX_FILE_SIZE_KB,
            'allowed_mimes' => ProductImageService::ALLOWED_MIMES,
            'allowed_ext' => ProductImageService::ALLOWED_EXT,
        ]);
    }
}
