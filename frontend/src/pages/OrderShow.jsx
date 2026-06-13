import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrder, updateOrderStatus } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const statusMap = { pending: '待付款', paid: '已付款', shipped: '已发货', cancelled: '已取消', completed: '已完成' }
const statusClass = { pending: 'bg-amber-100 text-amber-800', paid: 'bg-green-100 text-green-800', shipped: 'bg-blue-100 text-blue-800', cancelled: 'bg-gray-100 text-gray-600', completed: 'bg-emerald-100 text-emerald-800' }

export default function OrderShow() {
  const { id } = useParams()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState(null)

  const load = () => getOrder(id).then(setOrder).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [id])

  const handleStatus = (status) => {
    updateOrderStatus(id, status).then(() => { showToast('订单状态已更新', 'success'); load() }).catch((e) => showToast(e.message))
  }

  const handleCancel = async () => {
    const ok = await confirm({
      title: '取消订单',
      message: '确定取消？将退回库存。',
      confirmText: '确认取消',
      tone: 'danger',
    })
    if (!ok) return
    handleStatus('cancelled')
  }

  if (err && !order) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!order) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const items = order.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">订单详情</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看订单信息与明细，可更新状态或取消订单</p>
        </div>
        <Link to="/orders" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">返回列表</Link>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-800">订单信息</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClass[order.status] || 'bg-gray-100'}`}>{statusMap[order.status] || order.status}</span>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><dt className="text-gray-500 text-sm">订单号</dt><dd className="font-medium text-gray-800 mt-0.5">{order.order_no}</dd></div>
          <div><dt className="text-gray-500 text-sm">总金额</dt><dd className="text-primary font-bold text-lg mt-0.5">¥{Number(order.total_amount).toFixed(2)}</dd></div>
          <div><dt className="text-gray-500 text-sm">创建时间</dt><dd className="mt-0.5">{order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</dd></div>
          {order.remark && <div className="sm:col-span-2"><dt className="text-gray-500 text-sm">备注</dt><dd className="mt-0.5 text-gray-700">{order.remark}</dd></div>}
        </dl>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        <h2 className="px-4 py-3 bg-primary-light border-b border-orange-100 font-semibold text-gray-800">订单明细（{items.length} 项）</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">单价</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">数量</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">小计</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t hover:bg-orange-50/50">
                  <td className="px-4 py-3 text-sm font-medium">{item.product_name}</td>
                  <td className="px-4 py-3 text-sm">¥{Number(item.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-primary font-medium">¥{Number(item.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3">操作</h3>
        <div className="flex flex-wrap gap-2">
          {order.status === 'pending' && <button type="button" onClick={() => handleStatus('paid')} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium">标记已付款</button>}
          {order.status === 'paid' && <button type="button" onClick={() => handleStatus('shipped')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">标记已发货</button>}
          {order.status === 'shipped' && <button type="button" onClick={() => handleStatus('completed')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">操作已完成</button>}
          {(order.status === 'pending' || order.status === 'paid') && <button type="button" onClick={handleCancel} className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg font-medium">取消订单</button>}
        </div>
      </div>
    </div>
  )
}
