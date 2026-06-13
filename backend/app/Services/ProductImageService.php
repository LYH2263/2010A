<?php

namespace App\Services;

use App\Models\ProductImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductImageService
{
    public const MAX_IMAGES_PER_PRODUCT = 20;
    public const MAX_FILE_SIZE_KB = 5120;
    public const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    public const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    public function upload(UploadedFile $file, string $sessionId): ProductImage
    {
        $this->validateFile($file);

        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, self::ALLOWED_EXT, true)) {
            $mimeMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
            $mime = $file->getMimeType();
            $ext = $mimeMap[$mime] ?? 'jpg';
        }

        $dateDir = date('Y/m/d');
        $fileName = Str::uuid()->toString() . '.' . $ext;
        $relativeDir = 'product-images/' . $dateDir;
        $relativePath = $relativeDir . '/' . $fileName;

        $storedPath = $file->storeAs($relativeDir, $fileName, 'public');
        if (!$storedPath) {
            throw new \RuntimeException('图片存储失败');
        }

        $url = 'storage/' . ltrim($storedPath, '/');

        return ProductImage::create([
            'product_id' => null,
            'path' => $storedPath,
            'url' => $url,
            'sort' => 0,
            'is_main' => false,
            'session_id' => $sessionId,
        ]);
    }

    public function validateFile(UploadedFile $file): void
    {
        if (!$file->isValid()) {
            throw new \InvalidArgumentException('无效的上传文件');
        }

        $sizeKb = $file->getSize() / 1024;
        if ($sizeKb > self::MAX_FILE_SIZE_KB) {
            throw new \InvalidArgumentException('图片大小不能超过 ' . self::MAX_FILE_SIZE_KB . 'KB');
        }

        $mime = $file->getMimeType();
        if (!in_array($mime, self::ALLOWED_MIMES, true)) {
            throw new \InvalidArgumentException('仅支持 JPG/PNG/GIF/WEBP 格式图片');
        }
    }

    public function syncImages(int $productId, array $imagePayloads, string $sessionId): void
    {
        DB::transaction(function () use ($productId, $imagePayloads, $sessionId) {
            $existingImages = ProductImage::where('product_id', $productId)
                ->orWhere(function ($q) use ($sessionId) {
                    $q->whereNull('product_id')->where('session_id', $sessionId);
                })
                ->get()
                ->keyBy('id');

            $incomingIds = [];
            $mainFound = false;

            foreach ($imagePayloads as $index => $payload) {
                $id = (int) ($payload['id'] ?? 0);
                $isMain = (bool) ($payload['is_main'] ?? false);
                if ($isMain && $mainFound) {
                    $isMain = false;
                }
                if ($isMain) {
                    $mainFound = true;
                }

                $image = $existingImages->get($id);
                if (!$image) {
                    continue;
                }

                $image->update([
                    'product_id' => $productId,
                    'sort' => $index,
                    'is_main' => $isMain,
                    'session_id' => null,
                ]);

                $incomingIds[] = $id;
            }

            if (!$mainFound && count($incomingIds) > 0) {
                $firstId = $incomingIds[0];
                ProductImage::where('id', $firstId)->update(['is_main' => true]);
            }

            $toDeleteIds = $existingImages->keys()->diff($incomingIds)->all();
            if (!empty($toDeleteIds)) {
                $toDelete = ProductImage::whereIn('id', $toDeleteIds)->get();
                foreach ($toDelete as $img) {
                    $img->deleteFile();
                }
                ProductImage::whereIn('id', $toDeleteIds)->delete();
            }

            ProductImage::where('product_id', $productId)
                ->whereNotIn('id', $incomingIds)
                ->each(function ($img) {
                    $img->deleteFile();
                    $img->delete();
                });
        });
    }

    public function cleanupOrphanImages(int $olderThanHours = 24): int
    {
        $cutoff = now()->subHours($olderThanHours);
        $orphans = ProductImage::whereNull('product_id')
            ->where('created_at', '<', $cutoff)
            ->get();

        $count = 0;
        foreach ($orphans as $img) {
            try {
                $img->deleteFile();
                $img->delete();
                $count++;
            } catch (\Throwable $e) {
                report($e);
            }
        }
        return $count;
    }

    public function ensureMainImageUnique(int $productId): void
    {
        DB::transaction(function () use ($productId) {
            $mainImages = ProductImage::where('product_id', $productId)
                ->where('is_main', true)
                ->orderBy('sort')
                ->orderBy('id')
                ->get();

            if ($mainImages->count() > 1) {
                $keepId = $mainImages->first()->id;
                ProductImage::where('product_id', $productId)
                    ->where('is_main', true)
                    ->where('id', '!=', $keepId)
                    ->update(['is_main' => false]);
            }

            if ($mainImages->count() === 0) {
                $first = ProductImage::where('product_id', $productId)
                    ->orderBy('sort')
                    ->orderBy('id')
                    ->first();
                if ($first) {
                    $first->update(['is_main' => true]);
                }
            }
        });
    }
}
