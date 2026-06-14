import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart,
} from 'recharts'
import { getSalesReport, exportSalesReportUrl } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const STATUS_PIE_COLORS = {
  pending: '#f59e0b',
  paid: '#22c55e',
  shipped: '#3b82f6',
  cancelled: '#94a3b8',
  completed: '#10b981',
}

const PIE_COLOR_PALETTE = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4']

const fmtYMD = (d) => d.toISOString().slice(0, 10)

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function startOfMonth(d) {
  const x = new Date(d)
  x.setDate(1)
  return x
}
function endOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return x
}

export default function SalesReport() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const today = new Date()
  const defaultStart = fmtYMD(addDays(today, -29))
  const defaultEnd = fmtYMD(today)

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [grain, setGrain] = useState('day')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loadingStartTime, setLoadingStartTime] = useState(null)
  const exportIframeRef = useRef(null)

  const params = useMemo(() => ({
    start_date: startDate,
    end_date: endDate,
    grain,
  }), [startDate, endDate, grain])

  const load = () => {
    setLoading(true)
    setLoadingStartTime(Date.now())
    setError(null)
    getSalesReport(params)
      .then(setData)
      .catch((e) => {
        setError(e.message || '加载失败')
        showToast(e.message || '加载失败', 'error')
      })
      .finally(() => {
        setLoading(false)
        setLoadingStartTime(null)
      })
  }

  useEffect(() => {
    load()
  }, [params.start_date, params.end_date, params.grain])

  const applyPreset = (key) => {
    const t = new Date()
    let s, e
    switch (key) {
      case '7d':
        s = addDays(t, -6); e = t; break
      case '30d':
        s = addDays(t, -29); e = t; break
      case '90d':
        s = addDays(t, -89); e = t; break
      case 'this_month':
        s = startOfMonth(t); e = t; break
      case 'last_month': {
        const firstLast = startOfMonth(t); firstLast.setMonth(firstLast.getMonth() - 1)
        s = firstLast; e = endOfMonth(firstLast); break
      }
      case 'this_quarter': {
        const q = Math.floor(t.getMonth() / 3)
        s = new Date(t.getFullYear(), q * 3, 1)
        e = t
        break
      }
      default:
        return
    }
    setStartDate(fmtYMD(s))
    setEndDate(fmtYMD(e))
  }

  const handleExport = () => {
    const url = exportSalesReportUrl(params)
    if (!exportIframeRef.current) {
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.name = 'sales-report-export-frame'
      document.body.appendChild(iframe)
      exportIframeRef.current = iframe
    }
    exportIframeRef.current.src = url
    showToast('导出已开始，若浏览器未自动下载请检查弹窗拦截设置')
  }

  const validateDates = () => {
    if (!startDate || !endDate) return false
    const s = new Date(startDate), e = new Date(endDate)
    if (s > e) {
      showToast('开始日期不能晚于结束日期', 'error')
      return false
    }
    return true
  }

  const getSpanDays = () => {
    const s = new Date(startDate), e = new Date(endDate)
    return Math.ceil((e - s) / 86400000)
  }

  const handleApply = async () => {
    if (!validateDates()) return
    const spanDays = getSpanDays()
    if (spanDays > 365 && grain === 'day') {
      const ok = await confirm({
        title: '查询区间较大',
        message: `您选择了约 ${spanDays} 天的查询区间，且使用「按日」粒度，数据点较多可能导致图表拥挤、查询较慢。是否继续？\n\n建议：切换为「按周」或「按月」粒度可获得更清晰的趋势和更快的速度。`,
        confirmText: '继续查询',
        cancelText: '切换为按周',
        tone: 'info',
      })
      if (!ok) {
        setGrain('week')
        return
      }
    } else if (spanDays > 730) {
      const ok = await confirm({
        title: '查询时间跨度较大',
        message: `您选择了约 ${spanDays} 天（超过2年）的查询区间，统计将完整覆盖全部时间段，但查询可能需要稍长时间。是否继续？`,
        confirmText: '继续查询',
        cancelText: '取消',
        tone: 'info',
      })
      if (!ok) return
    }
    load()
  }

  if (error && !data) {
    return (
      <div className="p-4 text-center text-gray-600 space-y-3">
        <div>加载失败：{error}</div>
        <button type="button" onClick={load} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">重试</button>
      </div>
    )
  }

  const summary = data?.summary || {}
  const trend = data?.trend || []
  const statusBreakdown = data?.status_breakdown || []
  const categoryTop = data?.category_top || []
  const productTop = data?.product_top || []
  const warnings = data?.warnings || []

  const pieData = statusBreakdown.map((s) => ({ name: s.label, value: Number(s.count), status: s.status }))
  const statusTotalCount = pieData.reduce((a, b) => a + b.value, 0)

  const categoryChart = categoryTop.map((c, i) => ({
    name: c.category_name.length > 12 ? c.category_name.slice(0, 12) + '…' : c.category_name,
    fullName: c.category_name,
    销售额: Number(c.sales_amount),
    color: PIE_COLOR_PALETTE[i % PIE_COLOR_PALETTE.length],
  }))

  const productChart = productTop.map((p, i) => ({
    name: p.product_name.length > 16 ? p.product_name.slice(0, 16) + '…' : p.product_name,
    fullName: p.product_name,
    销量: Number(p.quantity),
    销售额: Number(p.sales_amount),
    color: PIE_COLOR_PALETTE[i % PIE_COLOR_PALETTE.length],
  }))

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-light to-white rounded-2xl shadow p-6 border border-orange-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">销售分析报表</h1>
          <p className="text-gray-600 mt-1">自定义时间区间查看营业额、订单量、客单价、商品分类及畅销排行。</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading || !data}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          导出 CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {[
            { k: '7d', label: '近7日' },
            { k: '30d', label: '近30日' },
            { k: '90d', label: '近90日' },
            { k: 'this_month', label: '本月' },
            { k: 'last_month', label: '上月' },
            { k: 'this_quarter', label: '本季度' },
          ].map((p) => (
            <button
              key={p.k}
              type="button"
              onClick={() => applyPreset(p.k)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-700 hover:border-primary hover:text-primary hover:bg-primary-light/50 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">统计粒度</label>
            <div className="inline-flex rounded-md overflow-hidden border border-gray-300">
              {[
                { v: 'day', l: '日' },
                { v: 'week', l: '周' },
                { v: 'month', l: '月' },
              ].map((g) => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setGrain(g.v)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    grain === g.v
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {g.l}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          >
            应用
          </button>
          <div className="ml-auto text-sm text-gray-500">
            {loading ? (
              <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />查询中...</span>
            ) : summary.start_date ? (
              <>当前区间：<span className="font-medium text-gray-700">{summary.start_date}</span> 至 <span className="font-medium text-gray-700">{summary.end_date}</span></>
            ) : null}
          </div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => {
            const isWarning = w.level === 'warning'
            const bgCls = isWarning ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
            const textCls = isWarning ? 'text-amber-800' : 'text-blue-800'
            const icon = isWarning ? '⚠️' : '💡'
            return (
              <div key={i} className={`${bgCls} border rounded-xl px-5 py-3.5 flex flex-wrap items-start gap-3`}>
                <div className="flex-shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${textCls} whitespace-pre-line leading-relaxed`}>{w.message}</div>
                </div>
                {w.type === 'grain_suggest' && w.suggest_grain && (
                  <button
                    type="button"
                    onClick={() => { setGrain(w.suggest_grain) }}
                    className="flex-shrink-0 px-3 py-1.5 text-sm font-medium bg-white rounded-lg border border-gray-200 text-primary hover:bg-primary-light hover:border-primary transition-colors"
                  >
                    切换为{w.suggest_grain === 'week' ? '按周' : '按月'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="营业额合计" value={'¥' + Number(summary.revenue_total ?? 0).toFixed(2)} hint="已付款/已发货/已完成 扣除退款" iconColor="bg-emerald-100 text-emerald-700" icon="¥" />
        <StatCard title="有效订单数" value={Number(summary.order_count_total ?? 0)} hint="计入营业额的订单笔数" iconColor="bg-blue-100 text-blue-700" icon="📦" />
        <StatCard title="总订单数" value={Number(summary.all_order_count_total ?? 0)} hint="含未付款、已取消的全部订单" iconColor="bg-amber-100 text-amber-700" icon="📋" />
        <StatCard title="客单价" value={'¥' + Number(summary.aov ?? 0).toFixed(2)} hint="营业额 ÷ 有效订单数" iconColor="bg-purple-100 text-purple-700" icon="🎯" />
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white rounded-xl shadow overflow-hidden border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-800 mb-2">营业额与订单量趋势</h3>
              <div className="h-80">
                {trend.length === 0 ? (
                  <EmptyHint />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period_label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} label={{ value: '订单数', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#64748b' } }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => '¥' + v} label={{ value: '营业额', angle: 90, position: 'insideRight', style: { fontSize: 12, fill: '#64748b' } }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null
                          const d = payload[0]?.payload
                          return (
                            <div className="bg-white shadow-lg border border-gray-200 rounded-md p-3 text-sm space-y-1">
                              <div className="font-medium text-gray-800">{label}</div>
                              <div>有效订单：<span className="font-medium text-blue-600">{d.order_count}</span> 笔</div>
                              <div>总订单：<span className="font-medium text-gray-600">{d.all_order_count}</span> 笔</div>
                              <div>营业额：<span className="font-medium text-emerald-600">¥{Number(d.revenue).toFixed(2)}</span></div>
                              <div>客单价：<span className="font-medium text-purple-600">¥{Number(d.aov).toFixed(2)}</span></div>
                            </div>
                          )
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="left" dataKey="order_count" name="有效订单" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" name="营业额(元)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-800 mb-2">订单状态占比</h3>
              <div className="h-80">
                {pieData.length === 0 ? (
                  <EmptyHint />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#cbd5e1' }}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={STATUS_PIE_COLORS[entry.status] || PIE_COLOR_PALETTE[i % PIE_COLOR_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} 笔 (${statusTotalCount ? ((value / statusTotalCount) * 100).toFixed(1) : 0}%)`, '订单数']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="text-xs text-gray-500 text-center mt-1">总订单数：{statusTotalCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-800 mb-2">商品分类销售额 Top {categoryTop.length}</h3>
              <div className="h-80">
                {categoryChart.length === 0 ? (
                  <EmptyHint />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChart} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={true} vertical={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => '¥' + v} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                      <Tooltip
                        formatter={(value, name, props) => {
                          const fn = props.payload?.fullName
                          return ['¥' + Number(value).toFixed(2), fn || name]
                        }}
                      />
                      <Bar dataKey="销售额" radius={[0, 4, 4, 0]} barSize={18}>
                        {categoryChart.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-800 mb-2">畅销商品 Top {productTop.length}（按销量）</h3>
              <div className="h-80">
                {productChart.length === 0 ? (
                  <EmptyHint />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productChart} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={true} vertical={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null
                          const p = payload[0]?.payload
                          return (
                            <div className="bg-white shadow-lg border border-gray-200 rounded-md p-3 text-sm space-y-1">
                              <div className="font-medium text-gray-800">{p.fullName}</div>
                              <div>销量：<span className="font-medium text-primary">{p.销量}</span> 件</div>
                              <div>销售额：<span className="font-medium text-emerald-600">¥{Number(p.销售额).toFixed(2)}</span></div>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="销量" radius={[0, 4, 4, 0]} barSize={18}>
                        {productChart.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {(categoryTop.length > 0 || productTop.length > 0) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {categoryTop.length > 0 && (
                <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-semibold text-gray-800">
                    商品分类销售额 Top 明细表
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm divide-y divide-gray-100">
                      <thead className="bg-gray-50/60">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-16">排名</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">分类名称</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">销售额(元)</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">销量(件)</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-28">占比</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {categoryTop.map((c) => (
                          <tr key={c.rank} className="hover:bg-orange-50/40">
                            <td className="px-4 py-2">
                              <RankBadge rank={c.rank} />
                            </td>
                            <td className="px-4 py-2 font-medium text-gray-800">{c.category_name}</td>
                            <td className="px-4 py-2 text-right text-emerald-600 font-medium">¥{Number(c.sales_amount).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right text-gray-700">{c.quantity}</td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="flex-1 max-w-[60px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: Math.min(c.ratio, 100) + '%' }} />
                                </div>
                                <span className="text-gray-600 text-xs w-12 text-right">{c.ratio}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {productTop.length > 0 && (
                <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-semibold text-gray-800">
                    畅销商品 Top N 明细表
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm divide-y divide-gray-100">
                      <thead className="bg-gray-50/60">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-16">排名</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">商品名称</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">销售额(元)</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">销量(件)</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-28">销量占比</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {productTop.map((p) => (
                          <tr key={p.rank} className="hover:bg-orange-50/40">
                            <td className="px-4 py-2">
                              <RankBadge rank={p.rank} />
                            </td>
                            <td className="px-4 py-2 font-medium text-gray-800">{p.product_name}</td>
                            <td className="px-4 py-2 text-right text-emerald-600 font-medium">¥{Number(p.sales_amount).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right text-primary font-medium">{p.quantity}</td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="flex-1 max-w-[60px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: Math.min(p.ratio, 100) + '%' }} />
                                </div>
                                <span className="text-gray-600 text-xs w-12 text-right">{p.ratio}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ title, value, hint, iconColor, icon }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-primary mt-1 truncate">{value}</p>
          <p className="text-xs text-gray-400 mt-1 truncate">{hint}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function RankBadge({ rank }) {
  const cls =
    rank === 1 ? 'bg-yellow-400 text-white'
    : rank === 2 ? 'bg-gray-400 text-white'
    : rank === 3 ? 'bg-amber-600 text-white'
    : 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${cls}`}>
      {rank}
    </span>
  )
}

function EmptyHint() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      该区间暂无数据
    </div>
  )
}
