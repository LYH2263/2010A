<?php

namespace App\Http\Controllers;

use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 15), 50);
        $filters = [];

        $isRead = $request->query('is_read');
        if ($isRead !== null && $isRead !== '') {
            $filters['is_read'] = filter_var($isRead, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        }

        $type = $request->query('type');
        if (is_string($type) && trim($type) !== '') {
            $filters['type'] = trim($type);
        }

        $keyword = $request->query('keyword');
        if (is_string($keyword) && trim($keyword) !== '') {
            $filters['keyword'] = trim($keyword);
        }

        $notifications = $this->notificationService->list($perPage, ['filters' => $filters]);

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $this->notificationService->unreadCount(),
            'default_threshold' => $this->notificationService->getDefaultThreshold(),
        ]);
    }

    public function summary(): JsonResponse
    {
        $unreadCount = $this->notificationService->unreadCount();
        $recent = $this->notificationService->getRecent(10);
        $recentUnread = $this->notificationService->getRecentUnread(10);

        return response()->json([
            'unread_count' => $unreadCount,
            'recent' => $recent,
            'recent_unread' => $recentUnread,
            'default_threshold' => $this->notificationService->getDefaultThreshold(),
        ]);
    }

    public function unreadCount(): JsonResponse
    {
        return response()->json([
            'unread_count' => $this->notificationService->unreadCount(),
        ]);
    }

    public function markAsRead(int $id): JsonResponse
    {
        try {
            $notification = $this->notificationService->markAsRead($id);
            if (!$notification) {
                return response()->json(['message' => '通知不存在'], 404);
            }
            return response()->json([
                'notification' => $notification,
                'unread_count' => $this->notificationService->unreadCount(),
            ]);
        } catch (\Throwable $e) {
            Log::error('NotificationController@markAsRead', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            $count = $this->notificationService->markAllAsRead();
            return response()->json([
                'marked_count' => $count,
                'unread_count' => $this->notificationService->unreadCount(),
            ]);
        } catch (\Throwable $e) {
            Log::error('NotificationController@markAllAsRead', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function show(int $id): JsonResponse
    {
        $notification = $this->notificationService->find($id);
        if (!$notification) {
            return response()->json(['message' => '通知不存在'], 404);
        }

        if (!$notification->is_read) {
            $notification->markAsRead();
        }

        return response()->json([
            'notification' => $notification->fresh(),
            'unread_count' => $this->notificationService->unreadCount(),
        ]);
    }
}
