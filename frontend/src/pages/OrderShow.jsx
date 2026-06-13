import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrder, updateOrderStatus, createRefund } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const statusMap = { pending: '待付款', paid: '已付款', shipped: '已发货', cancelled: '已取消', completed: '已完成' }
const statusClass = { pending: 'bg-amber-100 text-amber-800', paid: 'bg-green-100 text-green-800', shipped: 'bg-blue-100 text-blue-800', cancelled: 'bg-gray-100 text-gray-600', completed: 'bg-emerald-100 text-emerald-800' }
const refundStatusMap = { none: '无退款', partial: '部分退款', full: '全额退款' }
const refundStatusClass = { none: '', partial: 'bg-orange-100 text-orange-800', full: 'bg-red-100 text-red-800' }
const refundStateMap = { pending: '待审核', approved: '已通过', rejected: '已拒绝', completed: '已完成' }
const refundStateClass = { pending: 'bg-amber-100 text-amber-800', approved: 'bg-blue-100 text-blue-800', rejected: 'bg-gray-100 text-gray-600', completed: 'bg-emerald-100 text-emerald-800' }

function computeRefundedQuantities(order) {
  const map = {}
  const refunds = order.refunds || []
  refunds.forEach((r) => {
    if (r.status === 'approved' || r.status === 'completed' || r.status === 'pending') {
      ;(r.items || []).forEach((it) => {
        map[it.order_item_id] = (map[it.order_item_id] || 0) + (it.quantity || 0)
      })
    }
  })
  return map
}

export default function OrderShow() {
  const { id } = useParams()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState(null)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refundSelections, setRefundSelections] = useState({})
  const [submittingRefund, setSubmittingRefund] = useState(false)

  const load = () => getOrder(id).then(setOrder).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [id])

  const handleStatus = (status) => {
    updateOrderStatus(id, status).then(() => { showToast('订单状态已更新', 'success'); load() }).catch((e) => showToast(e.message))
  }

  const handleCancel = async () => {
    const ok = await confirm({
      title: '取消订单',
      message: '确定取消？将退回剩余未退库存。',
      confirmText: '确认取消',
      tone: 'danger',
    })
    if (!ok) return
    handleStatus('cancelled')
  }

  const canApplyRefund = order && (order.status === 'paid' || order.status === 'shipped' || order.status === 'completed') && order.refund_status !== 'full'

  const openRefundDialog = () => {
    if (!order) return
    const refunded = computeRefundedQuantities(order)
    const sel = {}
    ;(order.items || []).forEach((it) => {
      const remaining = it.quantity - (refunded[it.id] || 0)
      if (remaining > 0) {
        sel[it.id] = { selected: false, quantity: remaining, maxQty: remaining }
      }
    })
    setRefundSelections(sel)
    setRefundReason('')
    setShowRefundDialog(true)
  }

  const handleSelectAll = (checked) => {
    setRefundSelections((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => { next[k] = { ...next[k], selected: checked } })
      return next
    })
  }

  const handleItemToggle = (itemId, checked) => {
    setRefundSelections((prev) => ({ ...prev, [itemId]: { ...prev[itemId], selected: checked } }))
  }

  const handleQtyChange = (itemId, val) => {
    const n = parseInt(val, 10)
    if (Number.isNaN(n) || n <= 0) return
    setRefundSelections((prev) => {
      const cfg = prev[itemId]
      if (!cfg) return prev
      const qty = Math.max(1, Math.min(n, cfg.maxQty))
      return { ...prev, [itemId]: { ...cfg, quantity: qty } }
    })
  }

  const computeRefundTotal = () => {
    let total = 0
    ;(order.items || []).forEach((it) => {
      const cfg = refundSelections[it.id]
      if (cfg && cfg.selected) {
        total += Number(it.price) * cfg.quantity
      }
    })
    return total.toFixed(2)
  }

  const submitRefund = async () => {
    const items = []
    ;(order.items || []).forEach((it) => {
      const cfg = refundSelections[it.id]
      if (cfg && cfg.selected && cfg.quantity > 0) {
        items.push({ order_item_id: it.id, quantity: cfg.quantity })
      }
    })
    if (items.length === 0) { showToast('请选择至少一件退款商品'); return }
    if (!refundReason.trim()) { showToast('请填写退款原因'); return }
    setSubmittingRefund(true)
    try {
      await createRefund(order.id, { reason: refundReason.trim(), items })
      showToast('退款申请已提交', 'success')
      setShowRefundDialog(false)
      load()
    } catch (e) {
      showToast(e.message)
    } finally {
      setSubmittingRefund(false)
    }
  }

  if (err && !order) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!order) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const items = order.items ?? []
  const refunds = order.refunds ?? []
  const refunded = computeRefundedQuantities(order)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">订单详情</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看订单信息与明细，可更新状态、取消或申请退款</p>
        </div>
        <Link to="/orders" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">返回列表</Link>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-800">订单信息</h2>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClass[order.status] || 'bg-gray-100'}`}>{statusMap[order.status] || order.status}</span>
            {order.refund_status !== 'none' && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${refundStatusClass[order.refund_status] || ''}`}>{refundStatusMap[order.refund_status]}</span>
            )}
          </div>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><dt className="text-gray-500 text-sm">订单号</dt><dd className="font-medium text-gray-800 mt-0.5">{order.order_no}</dd></div>
          <div><dt className="text-gray-500 text-sm">订单金额</dt><dd className="text-primary font-bold text-lg mt-0.5">¥{Number(order.total_amount).toFixed(2)}</dd></div>
          {Number(order.total_refunded_amount) > 0 && (
            <div><dt className="text-gray-500 text-sm">已退金额</dt><dd className="text-red-600 font-bold text-lg mt-0.5">-¥{Number(order.total_refunded_amount).toFixed(2)}</dd></div>
          )}
          <div><dt className="text-gray-500 text-sm">创建时间</dt><dd className="mt-0.5">{order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</dd></div>
          {order.remark && <div className="sm:col-span-2"><dt className="text-gray-500 text-sm">备注</dt><dd className="mt-0.5 text-gray-700">{order.remark}</dd></div>}
        </dl>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        <h2 className="px-4 py-3 bg-primary-light border-b border-orange-100 font-semibold text-gray-800">订单明细（{items.length} 项）</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">单价</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">购买数量</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">已退数量</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">可退数量</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">小计</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const refundedQty = refunded[item.id] || 0
                const remaining = item.quantity - refundedQty
                return (
                  <tr key={item.id} className="border-t hover:bg-orange-50/50">
                    <td className="px-4 py-3 text-sm font-medium">{item.product_name}</td>
                    <td className="px-4 py-3 text-sm">¥{Number(item.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-red-600">{refundedQty}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{remaining}</td>
                    <td className="px-4 py-3 text-sm text-primary font-medium">¥{Number(item.subtotal).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        <h2 className="px-4 py-3 bg-primary-light border-b border-orange-100 font-semibold text-gray-800">退款记录（{refunds.length} 条）</h2>
        {refunds.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无退款记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">退款单号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">退款金额</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">退款原因</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">申请时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-orange-50/50">
                    <td className="px-4 py-3 text-sm font-medium">{r.refund_no}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${refundStateClass[r.status] || 'bg-gray-100'}`}>{refundStateMap[r.status] || r.status}</span></td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">-¥{Number(r.refund_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{r.reason || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3"><Link to={'/refunds/' + r.id} className="text-primary text-sm hover:underline">查看</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3">操作</h3>
        <div className="flex flex-wrap gap-2">
          {order.status === 'pending' && <button type="button" onClick={() => handleStatus('paid')} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium">标记已付款</button>}
          {order.status === 'paid' && <button type="button" onClick={() => handleStatus('shipped')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">标记已发货</button>}
          {order.status === 'shipped' && <button type="button" onClick={() => handleStatus('completed')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">操作已完成</button>}
          {canApplyRefund && <button type="button" onClick={openRefundDialog} className="bg-orange-100 hover:bg-orange-200 text-orange-800 px-4 py-2 rounded-lg font-medium">申请退款</button>}
          {(order.status === 'pending' || order.status === 'paid') && <button type="button" onClick={handleCancel} className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg font-medium">取消订单</button>}
        </div>
      </div>

      {showRefundDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" aria-label="关闭" onClick={() => !submittingRefund && setShowRefundDialog(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl border border-white/70 bg-white p-6 shadow-2xl flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">申请退款</h3>
              <button type="button" onClick={() => !submittingRefund && setShowRefundDialog(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none" aria-label="关闭">×</button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 -mr-1">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">退款原因</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  placeholder="请输入退款原因（最多 500 字）"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  maxLength={500}
                />
              </div>

              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">选择退款商品</span>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={Object.values(refundSelections).every((v) => v.selected)}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  全选
                </label>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full min-w-[480px] divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-10"></th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">商品</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-24">单价</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-28">可退数量</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-28">退款数量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const cfg = refundSelections[item.id]
                      if (!cfg) return null
                      return (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={cfg.selected}
                              onChange={(e) => handleItemToggle(item.id, e.target.checked)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-800">{item.product_name}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">¥{Number(item.price).toFixed(2)}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{cfg.maxQty}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              max={cfg.maxQty}
                              value={cfg.quantity}
                              disabled={!cfg.selected}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-100 disabled:text-gray-400"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-right">
                <span className="text-sm text-gray-600">预计退款金额：</span>
                <span className="text-lg font-bold text-red-600 ml-2">-¥{computeRefundTotal()}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3 border-t pt-4">
              <button type="button" onClick={() => !submittingRefund && setShowRefundDialog(false)} disabled={submittingRefund} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">取消</button>
              <button type="button" onClick={submitRefund} disabled={submittingRefund} className="rounded-lg bg-primary hover:bg-primary-hover px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {submittingRefund ? '提交中...' : '提交申请'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
