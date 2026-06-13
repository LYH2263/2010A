<?php

namespace App\Console\Commands;

use App\Services\ProductImageService;
use Illuminate\Console\Command;

class CleanupOrphanProductImages extends Command
{
    protected $signature = 'product-images:cleanup-orphans {--hours=24 : 清理超过多少小时未关联的图片}';

    protected $description = '清理上传后超过指定小时数仍未关联商品的临时图片';

    public function __construct(
        private ProductImageService $imageService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $hours = (int) $this->option('hours');
        $this->info("开始清理 {$hours} 小时以上未关联商品的图片...");

        $count = $this->imageService->cleanupOrphanImages($hours);

        $this->info("已清理 {$count} 条临时图片记录及对应文件");
        return self::SUCCESS;
    }
}
