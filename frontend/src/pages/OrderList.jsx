import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getOrders, updateOrderStatus } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const statusMap = { pending: '待付款', paid: '已付款', shipped: '已发货', cancelled: '已取消', completed: '已完成' }
const statusClass = { pending: 'bg-amber-100 text-amber-800', paid: 'bg-green-100 text-green-800', shipped: 'bg-blue-100 text-blue-800', cancelled: 'bg-gray-100 text-gray-600', completed: 'bg-emerald-100 text-emerald-800' }

const PER_PAGE = 15

export default function OrderList() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [orderNo, setOrderNo] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedOrderNo, setAppliedOrderNo] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (statusFilter) params.status = statusFilter
    if (appliedOrderNo) params.order_no = appliedOrderNo
    if (appliedDateFrom) params.date_from = appliedDateFrom
    if (appliedDateTo) params.date_to = appliedDateTo
    return getOrders(params).then(setRes).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { load(page) }, [page, statusFilter, appliedOrderNo, appliedDateFrom, appliedDateTo])

  const handleSearch = (e) => {
    e?.preventDefault()
    setAppliedOrderNo(orderNo.trim())
    setAppliedDateFrom(dateFrom.trim())
    setAppliedDateTo(dateTo.trim())
    setPage(1)
  }

  const handleReset = () => {
    setOrderNo('')
    setDateFrom('')
    setDateTo('')
    setAppliedOrderNo('')
    setAppliedDateFrom('')
    setAppliedDateTo('')
    setPage(1)
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const list = res.data ?? res
  const counts = res.order_counts || {}
  const totalAll = (counts.pending || 0) + (counts.paid || 0) + (counts.shipped || 0) + (counts.cancelled || 0) + (counts.completed || 0)

  const handleStatus = async (orderId, status) => {
    const msg = status === 'cancelled' ? '确定取消？将退回库存' : '确定要更新状态？'
    const ok = await confirm({
      title: '更新订单状态',
      message: msg,
      confirmText: '确认更新',
      tone: status === 'cancelled' ? 'danger' : 'default',
    })
    if (!ok) return
    updateOrderStatus(orderId, status).then(() => { showToast('订单状态已更新', 'success'); load(page) }).catch((e) => showToast(e.message))
  }
  const pendingCount = counts.pending || 0
  const paidCount = (counts.paid || 0) + (counts.shipped || 0)
  const total = res.total ?? list.length
  const currentPage = res.current_page ?? 1
  const lastPage = res.last_page ?? 1

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">订单列表</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看与处理全部订单，可按状态筛选</p>
        </div>
        <Link to="/orders/create" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shrink-0">创建订单</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => { setStatusFilter(''); setPage(1) }}
          className={`rounded-xl p-4 text-left border ${!statusFilter ? 'border-primary bg-primary-light' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
        >
          <p className="text-gray-500 text-xs">全部</p>
          <p className="text-lg font-bold text-gray-800">{totalAll}</p>
        </button>
        <button type="button" onClick={() => { setStatusFilter('pending'); setPage(1) }} className={`rounded-xl p-4 text-left border ${statusFilter === 'pending' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
          <p className="text-gray-500 text-xs">待付款</p>
          <p className="text-lg font-bold text-amber-700">{pendingCount}</p>
        </button>
        <button type="button" onClick={() => { setStatusFilter('paid'); setPage(1) }} className={`rounded-xl p-4 text-left border ${statusFilter === 'paid' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
          <p className="text-gray-500 text-xs">已付款</p>
          <p className="text-lg font-bold text-green-700">{counts.paid || 0}</p>
        </button>
        <button type="button" onClick={() => { setStatusFilter('shipped'); setPage(1) }} className={`rounded-xl p-4 text-left border ${statusFilter === 'shipped' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
          <p className="text-gray-500 text-xs">已发货</p>
          <p className="text-lg font-bold text-blue-700">{counts.shipped || 0}</p>
        </button>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">订单号</span>
          <input
            type="text"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder="输入订单号筛选"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">创建时间 起</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">创建时间 止</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">查询</button>
          <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无订单</p>
            <p className="text-sm mt-1">创建订单后会在列表中显示</p>
            <Link to="/orders/create" className="inline-block mt-4 text-primary hover:underline">去创建订单</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">订单号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">金额</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">创建时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((o) => (
                    <tr key={o.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm font-medium">{o.order_no}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${statusClass[o.status] || 'bg-gray-100'}`}>{statusMap[o.status] || o.status}</span></td>
                      <td className="px-4 py-3 text-sm text-primary font-medium">¥{Number(o.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={'/orders/' + o.id} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-lg font-medium text-sm inline-block">详情</Link>
                        {o.status === 'pending' && <button type="button" onClick={() => handleStatus(o.id, 'paid')} className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg font-medium text-sm">标记已付款</button>}
                        {o.status === 'paid' && <button type="button" onClick={() => handleStatus(o.id, 'shipped')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-lg font-medium text-sm">标记已发货</button>}
                        {o.status === 'shipped' && <button type="button" onClick={() => handleStatus(o.id, 'completed')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium text-sm">操作已完成</button>}
                        {(o.status === 'pending' || o.status === 'paid') && <button type="button" onClick={() => handleStatus(o.id, 'cancelled')} className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg font-medium text-sm">取消订单</button>}
                      </div>
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 条订单{(statusFilter || appliedOrderNo || appliedDateFrom || appliedDateTo) ? '（当前筛选）' : ''}</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
