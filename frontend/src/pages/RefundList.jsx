import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRefunds, approveRefund, rejectRefund } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const refundStateMap = { pending: '待审核', approved: '已通过', rejected: '已拒绝', completed: '已完成' }
const refundStateClass = { pending: 'bg-amber-100 text-amber-800', approved: 'bg-blue-100 text-blue-800', rejected: 'bg-gray-100 text-gray-600', completed: 'bg-emerald-100 text-emerald-800' }
const PER_PAGE = 15

export default function RefundList() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [searchParams, setSearchParams] = useSearchParams()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10))
  const [showRejectDialog, setShowRejectDialog] = useState(null)
  const [rejectRemark, setRejectRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = (p = page, status = statusFilter) => {
    const params = { per_page: PER_PAGE, page: p }
    if (status) params.status = status
    return getRefunds(params).then(setRes).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { load(page, statusFilter) }, [page, statusFilter])

  useEffect(() => {
    const q = {}
    if (statusFilter) q.status = statusFilter
    if (page > 1) q.page = String(page)
    setSearchParams(q)
  }, [statusFilter, page])

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const list = res.data ?? res
  const counts = res.refund_counts || {}
  const totalAll = (counts.pending || 0) + (counts.approved || 0) + (counts.rejected || 0) + (counts.completed || 0)
  const total = res.total ?? list.length
  const currentPage = res.current_page ?? 1
  const lastPage = res.last_page ?? 1

  const handleApprove = async (refund) => {
    const ok = await confirm({
      title: '通过退款审核',
      message: `确定通过退款单【${refund.refund_no}】？将退回商品库存并退款 ¥${Number(refund.refund_amount).toFixed(2)}。`,
      confirmText: '确认通过',
      tone: 'default',
    })
    if (!ok) return
    try {
      await approveRefund(refund.id)
      showToast('审核通过，已退款并回补库存', 'success')
      load(page)
    } catch (e) {
      showToast(e.message)
    }
  }

  const openReject = (refund) => {
    setShowRejectDialog(refund)
    setRejectRemark('')
  }

  const submitReject = async () => {
    if (!rejectRemark.trim()) { showToast('请填写拒绝原因'); return }
    setSubmitting(true)
    try {
      await rejectRefund(showRejectDialog.id, rejectRemark.trim())
      showToast('已拒绝退款申请', 'success')
      setShowRejectDialog(null)
      load(page)
    } catch (e) {
      showToast(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">退款列表</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看与处理全部退款申请，可按状态筛选</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button type="button" onClick={() => { setStatusFilter(''); setPage(1) }} className={`rounded-xl p-4 text-left border ${!statusFilter ? 'border-primary bg-primary-light' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
          <p className="text-gray-500 text-xs">全部</p>
          <p className="text-lg font-bold text-gray-800">{totalAll}</p>
        </button>
        <button type="button" onClick={() => { setStatusFilter('pending'); setPage(1) }} className={`rounded-xl p-4 text-left border ${statusFilter === 'pending' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
          <p className="text-gray-500 text-xs">待审核</p>
          <p className="text-lg font-bold text-amber-700">{counts.pending || 0}</p>
        </button>
        <button type="button" onClick={() => { setStatusFilter('approved'); setPage(1) }} className={`rounded-xl p-4 text-left border ${statusFilter === 'approved' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
          <p className="text-gray-500 text-xs">已通过</p>
          <p className="text-lg font-bold text-blue-700">{(counts.approved || 0) + (counts.completed || 0)}</p>
        </button>
        <button type="button" onClick={() => { setStatusFilter('rejected'); setPage(1) }} className={`rounded-xl p-4 text-left border ${statusFilter === 'rejected' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
          <p className="text-gray-500 text-xs">已拒绝</p>
          <p className="text-lg font-bold text-gray-700">{counts.rejected || 0}</p>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无退款记录</p>
            <p className="text-sm mt-1">在订单详情页可发起退款申请</p>
            <Link to="/orders" className="inline-block mt-4 text-primary hover:underline">去查看订单</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">退款单号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">关联订单</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">退款金额</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">原因</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">申请时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((r) => (
                    <tr key={r.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm font-medium">{r.refund_no}</td>
                      <td className="px-4 py-3 text-sm">
                        {r.order ? (
                          <Link to={'/orders/' + r.order_id} className="text-primary hover:underline">{r.order.order_no}</Link>
                        ) : r.order_id}
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${refundStateClass[r.status] || 'bg-gray-100'}`}>{refundStateMap[r.status] || r.status}</span></td>
                      <td className="px-4 py-3 text-sm text-red-600 font-medium">-¥{Number(r.refund_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">{r.reason || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={'/refunds/' + r.id} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-lg font-medium text-sm inline-block">详情</Link>
                          {r.status === 'pending' && (
                            <>
                              <button type="button" onClick={() => handleApprove(r)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium text-sm">通过</button>
                              <button type="button" onClick={() => openReject(r)} className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg font-medium text-sm">拒绝</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>

      {showRejectDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" aria-label="关闭" onClick={() => !submitting && setShowRejectDialog(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">拒绝退款申请</h3>
              <p className="mt-2 text-sm text-gray-600">退款单：{showRejectDialog.refund_no}</p>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">拒绝原因</label>
            <textarea
              value={rejectRemark}
              onChange={(e) => setRejectRemark(e.target.value)}
              rows={3}
              placeholder="请输入拒绝原因"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => !submitting && setShowRejectDialog(null)} disabled={submitting} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">取消</button>
              <button type="button" onClick={submitReject} disabled={submitting} className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {submitting ? '提交中...' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
