import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCoupons, toggleCouponStatus } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const statusMap = { active: '启用中', inactive: '已停用' }
const statusClass = { active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-600' }
const typeMap = { fixed: '满减券', percent: '折扣券' }

const PER_PAGE = 15

export default function CouponList() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const load = (p = page) => {
    setLoading(true)
    const params = { per_page: PER_PAGE, page: p }
    if (statusFilter) params.status = statusFilter
    return getCoupons(params)
      .then(setRes)
      .catch((e) => { setErr(e.message); showToast(e.message) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page, statusFilter])

  const handleToggle = async (coupon) => {
    const action = coupon.status === 'active' ? '停用' : '启用'
    const ok = await confirm({
      title: `${action}优惠券`,
      message: `确定要${action}优惠券【${coupon.name}】吗？`,
      confirmText: `确认${action}`,
      tone: coupon.status === 'active' ? 'danger' : 'default',
    })
    if (!ok) return
    toggleCouponStatus(coupon.id)
      .then(() => { showToast(`优惠券已${action}`, 'success'); load(page) })
      .catch((e) => showToast(e.message))
  }

  if (err && !res) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res || loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const list = res.data ?? res
  const total = res.total ?? list.length
  const currentPage = res.current_page ?? 1
  const lastPage = res.last_page ?? 1

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">优惠券管理</h1>
          <p className="text-gray-500 text-sm mt-0.5">创建和管理优惠券，支持满减券和折扣券</p>
        </div>
        <Link to="/coupons/create" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shrink-0">新增优惠券</Link>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">状态</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="">全部</option>
            <option value="active">启用中</option>
            <option value="inactive">已停用</option>
          </select>
        </label>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无优惠券</p>
            <p className="text-sm mt-1">点击右上角按钮创建新的优惠券</p>
            <Link to="/coupons/create" className="inline-block mt-4 text-primary hover:underline">去创建</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">券码</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">面额/折扣</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">使用门槛</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">有效期</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">库存</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((c) => {
                    const remaining = (c.total_quantity || 0) - (c.used_quantity || 0)
                    return (
                      <tr key={c.id} className="hover:bg-orange-50">
                        <td className="px-4 py-3">
                          <code className="inline-block bg-gray-100 px-2 py-0.5 rounded text-sm font-mono">{c.code}</code>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{c.name}</td>
                        <td className="px-4 py-3 text-sm">{typeMap[c.type] || c.type}</td>
                        <td className="px-4 py-3 text-sm">
                          {c.type === 'fixed'
                            ? <span className="text-primary font-medium">¥{Number(c.value).toFixed(2)}</span>
                            : <span className="text-primary font-medium">{Number(c.value)}折</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {Number(c.min_amount) > 0 ? `满 ¥${Number(c.min_amount).toFixed(2)}` : '无门槛'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>{c.valid_from ? new Date(c.valid_from).toLocaleDateString() : '-'}</div>
                          <div className="text-gray-400">至 {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>剩余 <span className={remaining === 0 ? 'text-red-600 font-medium' : 'text-primary font-medium'}>{remaining}</span></div>
                          <div className="text-gray-400 text-xs">共 {c.total_quantity} · 已用 {c.used_quantity}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${statusClass[c.status] || 'bg-gray-100'}`}>{statusMap[c.status] || c.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => navigate('/coupons/' + c.id + '/edit')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-lg font-medium text-sm">编辑</button>
                            <button
                              type="button"
                              onClick={() => handleToggle(c)}
                              className={`px-3 py-1.5 rounded-lg font-medium text-sm ${c.status === 'active' ? 'bg-red-100 hover:bg-red-200 text-red-800' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
                            >
                              {c.status === 'active' ? '停用' : '启用'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 条优惠券{statusFilter ? '（当前筛选）' : ''}</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
