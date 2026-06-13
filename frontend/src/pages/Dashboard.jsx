import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import { getDashboard } from '../api'
import { useToast } from '../contexts/ToastContext'

const statusLabel = (s) => ({ pending: '待付款', paid: '已付款', shipped: '已发货', cancelled: '已取消', completed: '已完成' }[s] || s)
const statusColor = (s) => ({ pending: 'bg-amber-100 text-amber-800', paid: 'bg-green-100 text-green-800', shipped: 'bg-blue-100 text-blue-800', cancelled: 'bg-gray-100 text-gray-600', completed: 'bg-emerald-100 text-emerald-800' }[s] || 'bg-gray-100')

const PIE_COLORS = { pending: '#f59e0b', paid: '#22c55e', shipped: '#3b82f6', cancelled: '#94a3b8', completed: '#10b981' }

export default function Dashboard() {
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  const load = () => getDashboard().then(setData).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [])

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const recentOrders = data.recent_orders || []
  const lowStock = data.low_stock_products || []
  const orderCountsByStatus = data.order_counts_by_status || {}
  const ordersByDate = data.orders_by_date || []

  const pieData = Object.entries(orderCountsByStatus)
    .filter(([, n]) => Number(n) > 0)
    .map(([status, count]) => ({ name: statusLabel(status), value: Number(count), status }))

  const hasChartData = pieData.length > 0 || ordersByDate.some((d) => d.count > 0 || d.amount > 0)

  return (
    <div className="space-y-6">
      {/* 欢迎说明 */}
      <div className="bg-gradient-to-r from-primary-light to-white rounded-2xl shadow p-6 border border-orange-100">
        <h1 className="text-2xl font-bold text-gray-800">欢迎使用商品管理系统</h1>
        <p className="text-gray-600 mt-1">下方为核心数据概览、数据图表与最近动态，可通过顶部导航进入商品、分类、订单、库存等模块。</p>
      </div>

      {/* 统计卡片 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">核心数据</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">商品总数</p>
                <p className="text-2xl font-bold text-primary mt-1">{data.product_count}</p>
                <p className="text-xs text-gray-400 mt-1">在售与下架合计</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary text-xl font-bold">{data.product_count}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">订单总数</p>
                <p className="text-2xl font-bold text-primary mt-1">{data.order_count}</p>
                <p className="text-xs text-gray-400 mt-1">全部订单笔数</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary text-xl font-bold">{data.order_count}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">库存总量</p>
                <p className="text-2xl font-bold text-primary mt-1">{data.total_stock}</p>
                <p className="text-xs text-gray-400 mt-1">当前可售件数</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary text-xl font-bold">件</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">已收款金额</p>
                <p className="text-2xl font-bold text-primary mt-1">¥{Number(data.total_amount).toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">已付款+已发货</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      {hasChartData && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">数据图表</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 订单状态分布 */}
            {pieData.length > 0 && (
              <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100 p-4">
                <h3 className="font-medium text-gray-800 mb-2">订单状态分布</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name} ${value}`}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={entry.status} fill={PIE_COLORS[entry.status] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} 笔`, '订单数']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {/* 近 7 日订单与金额 */}
            {ordersByDate.length > 0 && (
              <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100 p-4">
                <h3 className="font-medium text-gray-800 mb-2">近 7 日订单与金额</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ordersByDate} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => '¥' + v} />
                      <Tooltip
                        formatter={(value, name) => {
                          const isAmount = name === 'amount' || name === '金额';
                          return [isAmount ? '¥' + Number(value).toFixed(2) : value, isAmount ? '订单金额' : '订单数'];
                        }}
                        labelFormatter={(label) => '日期 ' + label}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="count" name="订单数" fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="amount" name="订单金额" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近订单 */}
        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
          <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">最近订单</h2>
            <Link to="/orders" className="text-sm text-primary hover:underline">查看全部</Link>
          </div>
          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">暂无订单，<Link to="/orders/create" className="text-primary hover:underline">去创建</Link></div>
            ) : (
              <table className="w-full min-w-[360px] divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">订单号</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">金额</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-orange-50/50">
                      <td className="px-4 py-2 text-sm font-medium">{o.order_no}</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${statusColor(o.status)}`}>{statusLabel(o.status)}</span></td>
                      <td className="px-4 py-2 text-sm text-primary font-medium">¥{Number(o.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-2"><Link to={'/orders/' + o.id} className="text-primary text-sm hover:underline">详情</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 低库存提醒 */}
        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
          <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">低库存商品（≤10）</h2>
            <Link to="/inventory" className="text-sm text-primary hover:underline">去调整</Link>
          </div>
          <div className="overflow-x-auto">
            {lowStock.length === 0 ? (
              <div className="p-8 text-center text-gray-500">暂无低库存商品</div>
            ) : (
              <table className="w-full min-w-[360px] divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">商品</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">库存</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lowStock.map((p) => (
                    <tr key={p.id} className="hover:bg-orange-50/50">
                      <td className="px-4 py-2 text-sm font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{p.sku}</td>
                      <td className="px-4 py-2 text-sm font-medium text-orange-600">{p.stock}</td>
                      <td className="px-4 py-2"><Link to={'/inventory/' + p.id + '/adjust'} className="text-primary text-sm hover:underline">调整</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
