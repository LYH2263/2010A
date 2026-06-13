import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getRefund, approveRefund, rejectRefund } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const refundStateMap = { pending: '待审核', approved: '已通过', rejected: '已拒绝', completed: '已完成' }
const refundStateClass = { pending: 'bg-amber-100 text-amber-800', approved: 'bg-blue-100 text-blue-800', rejected: 'bg-gray-100 text-gray-600', completed: 'bg-emerald-100 text-emerald-800' }

export default function RefundShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [refund, setRefund] = useState(null)
  const [err, setErr] = useState(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectRemark, setRejectRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => getRefund(id).then(setRefund).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [id])

  const handleApprove = async () => {
    if (!refund) return
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
      load()
    } catch (e) {
      showToast(e.message)
    }
  }

  const submitReject = async () => {
    if (!rejectRemark.trim()) { showToast('请填写拒绝原因'); return }
    setSubmitting(true)
    try {
      await rejectRefund(refund.id, rejectRemark.trim())
      showToast('已拒绝退款申请', 'success')
      setShowRejectDialog(false)
      load()
    } catch (e) {
      showToast(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (err && !refund) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!refund) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const items = refund.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">退款详情</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看退款单信息、明细与审核状态</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/refunds" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">退款列表</Link>
          {refund.order && <Link to={'/orders/' + refund.order_id} className="bg-primary-light hover:bg-orange-100 text-primary px-4 py-2 rounded-lg font-medium">查看订单</Link>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-800">退款信息</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${refundStateClass[refund.status] || 'bg-gray-100'}`}>{refundStateMap[refund.status] || refund.status}</span>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><dt className="text-gray-500 text-sm">退款单号</dt><dd className="font-medium text-gray-800 mt-0.5">{refund.refund_no}</dd></div>
          <div><dt className="text-gray-500 text-sm">退款金额</dt><dd className="text-red-600 font-bold text-lg mt-0.5">-¥{Number(refund.refund_amount).toFixed(2)}</dd></div>
          <div><dt className="text-gray-500 text-sm">关联订单</dt>
            <dd className="mt-0.5">
              {refund.order ? (
                <Link to={'/orders/' + refund.order_id} className="text-primary hover:underline">{refund.order.order_no}</Link>
              ) : refund.order_id}
            </dd>
          </div>
          <div><dt className="text-gray-500 text-sm">申请时间</dt><dd className="mt-0.5">{refund.created_at ? new Date(refund.created_at).toLocaleString() : '-'}</dd></div>
          {refund.audited_at && <div><dt className="text-gray-500 text-sm">审核时间</dt><dd className="mt-0.5">{new Date(refund.audited_at).toLocaleString()}</dd></div>}
          {refund.reason && <div><dt className="text-gray-500 text-sm">退款原因</dt><dd className="mt-0.5 text-gray-700">{refund.reason}</dd></div>}
          {refund.audit_remark && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500 text-sm">审核备注</dt>
              <dd className="mt-0.5 text-gray-700">{refund.audit_remark}</dd>
            </div>
          )}
        </dl>
      </div>

      {refund.order && (
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <h2 className="px-4 py-3 bg-primary-light border-b border-orange-100 font-semibold text-gray-800">订单概览</h2>
          <dl className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div><dt className="text-gray-500">订单号</dt><dd className="font-medium mt-0.5">{refund.order.order_no}</dd></div>
            <div><dt className="text-gray-500">订单金额</dt><dd className="text-primary font-bold mt-0.5">¥{Number(refund.order.total_amount).toFixed(2)}</dd></div>
            {Number(refund.order.total_refunded_amount) > 0 && (
              <div><dt className="text-gray-500">累计已退</dt><dd className="text-red-600 font-bold mt-0.5">-¥{Number(refund.order.total_refunded_amount).toFixed(2)}</dd></div>
            )}
          </dl>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        <h2 className="px-4 py-3 bg-primary-light border-b border-orange-100 font-semibold text-gray-800">退款明细（{items.length} 项）</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">单价</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">退款数量</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">退款小计</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const specText = it.sku_specs
                  ? Object.entries(it.sku_specs).map(([k, v]) => `${k}: ${v}`).join(' / ')
                  : ''
                return (
                <tr key={it.id} className="border-t hover:bg-orange-50/50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-800">{it.product_name}</div>
                    {(it.sku_code || specText) && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {it.sku_code && <span className="inline-block bg-gray-100 px-1.5 py-0.5 rounded mr-2">SKU: {it.sku_code}</span>}
                        {specText && <span>{specText}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">¥{Number(it.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{it.quantity}</td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium">-¥{Number(it.subtotal).toFixed(2)}</td>
                </tr>
              )})}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-700">退款合计</td>
                <td className="px-4 py-3 text-red-600 font-bold">-¥{Number(refund.refund_amount).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {refund.status === 'pending' && (
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">审核操作</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">通过退款</button>
            <button type="button" onClick={() => { setShowRejectDialog(true); setRejectRemark('') }} className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg font-medium">拒绝退款</button>
          </div>
        </div>
      )}

      {showRejectDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" aria-label="关闭" onClick={() => !submitting && setShowRejectDialog(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">拒绝退款申请</h3>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">拒绝原因</label>
            <textarea
              value={rejectRemark}
              onChange={(e) => setRejectRemark(e.target.value)}
              rows={4}
              placeholder="请输入拒绝原因"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => !submitting && setShowRejectDialog(false)} disabled={submitting} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">取消</button>
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
