<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Refund;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SalesReportController extends Controller
{
    const REVENUE_STATUSES = [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED];
    const ALL_STATUSES = [Order::STATUS_PENDING, Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_CANCELLED, Order::STATUS_COMPLETED];
    const STATUS_LABELS = [
        Order::STATUS_PENDING => '待付款',
        Order::STATUS_PAID => '已付款',
        Order::STATUS_SHIPPED => '已发货',
        Order::STATUS_CANCELLED => '已取消',
        Order::STATUS_COMPLETED => '已完成',
    ];
    const GRAIN_DAY = 'day';
    const GRAIN_WEEK = 'week';
    const GRAIN_MONTH = 'month';

    public function index(Request $request)
    {
        try {
            [$start, $end, $grain] = $this->parseParams($request);

            $revenueOrdersQuery = Order::query()
                ->whereIn('status', self::REVENUE_STATUSES)
                ->whereBetween('created_at', [$start, $end]);

            $allOrdersQuery = Order::query()
                ->whereBetween('created_at', [$start, $end]);

            $refundSubquery = DB::table('refunds')
                ->whereIn('status', [Refund::STATUS_APPROVED, Refund::STATUS_COMPLETED])
                ->select('order_id', DB::raw('COALESCE(SUM(refund_amount), 0) as total_refund'))
                ->groupBy('order_id');

            $trendRaw = DB::table('orders as o')
                ->leftJoinSub($refundSubquery, 'r', 'o.id = r.order_id')
                ->whereIn('o.status', self::REVENUE_STATUSES)
                ->whereBetween('o.created_at', [$start, $end])
                ->select([
                    DB::raw($this->dateSelect($grain, 'o.created_at') . ' as period_key'),
                    DB::raw('COUNT(DISTINCT o.id) as order_count'),
                    DB::raw('COALESCE(SUM(CASE WHEN o.total_amount - COALESCE(r.total_refund, 0) > 0 THEN o.total_amount - COALESCE(r.total_refund, 0) ELSE 0 END), 0) as revenue'),
                ])
                ->groupBy('period_key')
                ->orderBy('period_key')
                ->get();

            $allOrdersTrendRaw = DB::table('orders as o')
                ->whereBetween('o.created_at', [$start, $end])
                ->select([
                    DB::raw($this->dateSelect($grain, 'o.created_at') . ' as period_key'),
                    DB::raw('COUNT(DISTINCT o.id) as total_order_count'),
                ])
                ->groupBy('period_key')
                ->pluck('total_order_count', 'period_key')
                ->toArray();

            $periods = $this->generatePeriods($start, $end, $grain);

            $revenueTotal = '0.00';
            $orderCountTotal = 0;
            $allOrderCountTotal = 0;
            $trendData = [];
            foreach ($periods as $p) {
                $key = $p['key'];
                $label = $p['label'];
                $row = $trendRaw->firstWhere('period_key', $key);
                $orderCount = $row ? (int) $row->order_count : 0;
                $revenue = $row ? number_format((float) $row->revenue, 2, '.', '') : '0.00';
                $allOrderCount = (int) ($allOrdersTrendRaw[$key] ?? 0);

                $aov = $orderCount > 0 ? number_format((float) bcdiv($revenue, (string) $orderCount, 2), 2, '.', '') : '0.00';

                $trendData[] = [
                    'period_key' => $key,
                    'period_label' => $label,
                    'order_count' => $orderCount,
                    'all_order_count' => $allOrderCount,
                    'revenue' => round((float) $revenue, 2),
                    'aov' => round((float) $aov, 2),
                ];

                $revenueTotal = bcadd($revenueTotal, $revenue, 2);
                $orderCountTotal += $orderCount;
                $allOrderCountTotal += $allOrderCount;
            }

            $statusBreakdown = DB::table('orders as o')
                ->whereBetween('o.created_at', [$start, $end])
                ->select('o.status', DB::raw('COUNT(DISTINCT o.id) as count'))
                ->groupBy('o.status')
                ->pluck('count', 'status')
                ->toArray();

            $statusData = [];
            foreach (self::ALL_STATUSES as $s) {
                $count = (int) ($statusBreakdown[$s] ?? 0);
                if ($count > 0) {
                    $statusData[] = [
                        'status' => $s,
                        'label' => self::STATUS_LABELS[$s],
                        'count' => $count,
                    ];
                }
            }

            $orderIdsForRevenue = DB::table('orders')
                ->whereIn('status', self::REVENUE_STATUSES)
                ->whereBetween('created_at', [$start, $end])
                ->pluck('id');

            if ($orderIdsForRevenue->isEmpty()) {
                $categoryTop = [];
                $productTop = [];
            } else {
                $categoryRaw = DB::table('order_items as oi')
                    ->join('products as p', 'oi.product_id', '=', 'p.id')
                    ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
                    ->whereIn('oi.order_id', $orderIdsForRevenue)
                    ->select([
                        'c.id as category_id',
                        DB::raw('COALESCE(c.name, "未分类") as category_name'),
                        DB::raw('COALESCE(SUM(oi.subtotal), 0) as sales_amount'),
                        DB::raw('SUM(oi.quantity) as qty'),
                    ])
                    ->groupBy('c.id', 'c.name')
                    ->orderByDesc('sales_amount')
                    ->limit(10)
                    ->get();

                $categoryTotal = '0.00';
                foreach ($categoryRaw as $r) {
                    $categoryTotal = bcadd($categoryTotal, (string) $r->sales_amount, 2);
                }

                $categoryTop = $categoryRaw->map(function ($r, $i) use ($categoryTotal) {
                    $ratio = bccomp($categoryTotal, '0.00', 2) > 0
                        ? (float) bcdiv((string) $r->sales_amount, $categoryTotal, 4) * 100
                        : 0;
                    return [
                        'rank' => $i + 1,
                        'category_id' => $r->category_id,
                        'category_name' => $r->category_name,
                        'sales_amount' => round((float) $r->sales_amount, 2),
                        'quantity' => (int) $r->qty,
                        'ratio' => round($ratio, 2),
                    ];
                })->values()->toArray();

                $productRaw = DB::table('order_items as oi')
                    ->whereIn('oi.order_id', $orderIdsForRevenue)
                    ->select([
                        'oi.product_id',
                        'oi.product_name',
                        DB::raw('COALESCE(SUM(oi.subtotal), 0) as sales_amount'),
                        DB::raw('SUM(oi.quantity) as qty'),
                    ])
                    ->groupBy('oi.product_id', 'oi.product_name')
                    ->orderByDesc('qty')
                    ->orderByDesc('sales_amount')
                    ->limit(10)
                    ->get();

                $productTotalQty = 0;
                foreach ($productRaw as $r) {
                    $productTotalQty += (int) $r->qty;
                }

                $productTop = $productRaw->map(function ($r, $i) use ($productTotalQty) {
                    $ratio = $productTotalQty > 0 ? round(((int) $r->qty / $productTotalQty) * 100, 2) : 0;
                    return [
                        'rank' => $i + 1,
                        'product_id' => $r->product_id,
                        'product_name' => $r->product_name,
                        'sales_amount' => round((float) $r->sales_amount, 2),
                        'quantity' => (int) $r->qty,
                        'ratio' => $ratio,
                    ];
                })->values()->toArray();
            }

            $overallAov = $orderCountTotal > 0
                ? round((float) bcdiv($revenueTotal, (string) $orderCountTotal, 2), 2)
                : 0;

            $summary = [
                'start_date' => $start->format('Y-m-d'),
                'end_date' => $end->format('Y-m-d'),
                'grain' => $grain,
                'revenue_total' => round((float) $revenueTotal, 2),
                'order_count_total' => $orderCountTotal,
                'all_order_count_total' => $allOrderCountTotal,
                'aov' => $overallAov,
            ];

            return response()->json([
                'summary' => $summary,
                'trend' => $trendData,
                'status_breakdown' => $statusData,
                'category_top' => $categoryTop,
                'product_top' => $productTop,
            ]);
        } catch (\Exception $e) {
            Log::error('SalesReportController@index', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json([
                'error' => '服务器错误',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function export(Request $request)
    {
        try {
            [$start, $end, $grain] = $this->parseParams($request);

            $result = $this->index($request);
            if ($result->getStatusCode() !== 200) {
                return $result;
            }
            $data = json_decode($result->getContent(), true);
            $summary = $data['summary'];
            $trend = $data['trend'];
            $status = $data['status_breakdown'];
            $categoryTop = $data['category_top'];
            $productTop = $data['product_top'];

            $filename = '销售分析_' . $start->format('Ymd') . '-' . $end->format('Ymd') . '.csv';

            $lines = [];
            $lines[] = $this->csvEscape([
                '统计区间：' . $summary['start_date'] . ' 至 ' . $summary['end_date'],
                '粒度：' . (['day' => '按日', 'week' => '按周', 'month' => '按月'][$grain] ?? $grain),
            ]);
            $lines[] = [];
            $lines[] = $this->csvEscape(['一、汇总指标']);
            $lines[] = $this->csvEscape(['营业额合计(元)', '有效订单数', '总订单数(含未付款/取消)', '客单价(元)']);
            $lines[] = $this->csvEscape([
                number_format((float) $summary['revenue_total'], 2, '.', ''),
                $summary['order_count_total'],
                $summary['all_order_count_total'],
                number_format((float) $summary['aov'], 2, '.', ''),
            ]);
            $lines[] = [];

            $lines[] = $this->csvEscape(['二、趋势明细（' . (['day' => '日', 'week' => '周', 'month' => '月'][$grain] ?? '') . '度）']);
            $lines[] = $this->csvEscape(['周期', '有效订单数', '总订单数', '营业额(元)', '客单价(元)']);
            foreach ($trend as $t) {
                $lines[] = $this->csvEscape([
                    $t['period_label'],
                    $t['order_count'],
                    $t['all_order_count'],
                    number_format((float) $t['revenue'], 2, '.', ''),
                    number_format((float) $t['aov'], 2, '.', ''),
                ]);
            }
            $lines[] = [];

            $lines[] = $this->csvEscape(['三、订单状态占比']);
            $lines[] = $this->csvEscape(['状态', '订单数', '占比(%)']);
            $statusTotal = array_sum(array_column($status, 'count'));
            foreach ($status as $s) {
                $ratio = $statusTotal > 0 ? round(($s['count'] / $statusTotal) * 100, 2) : 0;
                $lines[] = $this->csvEscape([$s['label'], $s['count'], (string) $ratio]);
            }
            $lines[] = [];

            $lines[] = $this->csvEscape(['四、商品分类销售额 Top']);
            $lines[] = $this->csvEscape(['排名', '分类ID', '分类名称', '销售额(元)', '销量(件)', '占比(%)']);
            foreach ($categoryTop as $c) {
                $lines[] = $this->csvEscape([
                    $c['rank'],
                    $c['category_id'] ?? '',
                    $c['category_name'],
                    number_format((float) $c['sales_amount'], 2, '.', ''),
                    $c['quantity'],
                    (string) $c['ratio'],
                ]);
            }
            if (empty($categoryTop)) {
                $lines[] = $this->csvEscape(['—', '—', '暂无数据', '0.00', '0', '0.00']);
            }
            $lines[] = [];

            $lines[] = $this->csvEscape(['五、畅销商品 Top N']);
            $lines[] = $this->csvEscape(['排名', '商品ID', '商品名称', '销售额(元)', '销量(件)', '销量占比(%)']);
            foreach ($productTop as $p) {
                $lines[] = $this->csvEscape([
                    $p['rank'],
                    $p['product_id'],
                    $p['product_name'],
                    number_format((float) $p['sales_amount'], 2, '.', ''),
                    $p['quantity'],
                    (string) $p['ratio'],
                ]);
            }
            if (empty($productTop)) {
                $lines[] = $this->csvEscape(['—', '—', '暂无数据', '0.00', '0', '0.00']);
            }

            $csv = "\xEF\xBB\xBF" . implode("\r\n", $lines) . "\r\n";

            return response($csv, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'Pragma' => 'no-cache',
                'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
                'Expires' => '0',
            ]);
        } catch (\Exception $e) {
            Log::error('SalesReportController@export', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json([
                'error' => '导出失败',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function parseParams(Request $request): array
    {
        $startInput = $request->input('start_date');
        $endInput = $request->input('end_date');
        $grain = $request->input('grain', self::GRAIN_DAY);
        if (!in_array($grain, [self::GRAIN_DAY, self::GRAIN_WEEK, self::GRAIN_MONTH], true)) {
            $grain = self::GRAIN_DAY;
        }

        if ($startInput) {
            $start = Carbon::parse($startInput)->startOfDay();
        } else {
            $start = now()->subDays(29)->startOfDay();
        }
        if ($endInput) {
            $end = Carbon::parse($endInput)->endOfDay();
        } else {
            $end = now()->endOfDay();
        }
        if ($end->lt($start)) {
            [$start, $end] = [$end, $start];
        }

        $maxDays = 400;
        if ($start->diffInDays($end) > $maxDays) {
            $start = $end->copy()->subDays($maxDays)->startOfDay();
        }

        return [$start, $end, $grain];
    }

    private function dateSelect(string $grain, string $field): string
    {
        switch ($grain) {
            case self::GRAIN_MONTH:
                return "DATE_FORMAT({$field}, '%Y-%m')";
            case self::GRAIN_WEEK:
                return "CONCAT(YEAR({$field}), '-W', LPAD(WEEK({$field}, 1), 2, '0'))";
            case self::GRAIN_DAY:
            default:
                return "DATE_FORMAT({$field}, '%Y-%m-%d')";
        }
    }

    private function generatePeriods(Carbon $start, Carbon $end, string $grain): array
    {
        $periods = [];
        $cursor = $start->copy();

        switch ($grain) {
            case self::GRAIN_MONTH:
                $cursor = $cursor->startOfMonth();
                $endCursor = $end->copy()->endOfMonth();
                while ($cursor->lte($endCursor)) {
                    $key = $cursor->format('Y-m');
                    $label = $cursor->format('Y年m月');
                    $periods[] = ['key' => $key, 'label' => $label];
                    $cursor->addMonthNoOverflow();
                }
                break;

            case self::GRAIN_WEEK:
                $weekStart = $cursor->copy()->startOfWeek(Carbon::MONDAY);
                $weekEnd = $end->copy()->endOfWeek(Carbon::SUNDAY);
                $weekCursor = $weekStart->copy();
                while ($weekCursor->lte($weekEnd)) {
                    $year = $weekCursor->year;
                    $weekNum = $weekCursor->weekOfYear;
                    $key = sprintf('%d-W%02d', $year, $weekNum);
                    $weekEndLabel = $weekCursor->copy()->endOfWeek(Carbon::SUNDAY);
                    if ($weekCursor->month !== $weekEndLabel->month) {
                        $label = $weekCursor->format('m月d日') . '~' . $weekEndLabel->format('m月d日');
                    } else {
                        $label = $weekCursor->format('m月d日') . '~' . $weekEndLabel->format('d日');
                    }
                    $periods[] = ['key' => $key, 'label' => $label];
                    $weekCursor->addWeek();
                }
                break;

            case self::GRAIN_DAY:
            default:
                while ($cursor->lte($end)) {
                    $key = $cursor->format('Y-m-d');
                    $label = $cursor->format('m-d');
                    $periods[] = ['key' => $key, 'label' => $label];
                    $cursor->addDay();
                }
                break;
        }

        return $periods;
    }

    private function csvEscape(array $fields): string
    {
        $out = [];
        foreach ($fields as $f) {
            $s = (string) $f;
            if (strpos($s, ',') !== false || strpos($s, '"') !== false || strpos($s, "\n") !== false || strpos($s, "\r") !== false) {
                $s = '"' . str_replace('"', '""', $s) . '"';
            }
            $out[] = $s;
        }
        return implode(',', $out);
    }
}
