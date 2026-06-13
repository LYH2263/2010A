import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCustomer } from '../api'
import { useToast } from '../contexts/ToastContext'

const statusMap = { pending: '待付款', paid: '已付款', shipped: '已发货', cancelled: '已取消', completed: '已完成' }
const statusClass = { pending: 'bg-amber-100 text-amber-800', paid: 'bg-green-100 text-green-800', shipped: 'bg-blue-100 text-blue-800', cancelled: 'bg-gray-100 text-gray-600', completed: 'bg-emerald-100 text-emerald-800' }
const levelMap = { normal: '普通', silver: '银卡', gold: '金卡', diamond: '钻石' }
const levelClass = { normal: 'bg-gray-100 text-gray-600', silver: 'bg-gray-200 text-gray-700', gold: 'bg-amber-100 text-amber-700', diamond: 'bg-cyan-100 text-cyan-700' }

export default function CustomerShow() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [customer, setCustomer] = useState(null)
  const [err, setErr] = useState(null)

  const load = () => getCustomer(id, true).then(setCustomer).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [id])

  if (err && !customer) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!customer) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const orders = customer.orders || []
  const orderTotal = orders.filter((o) => ['paid', 'shipped', 'completed'].includes(o.status)).length
  const spentTotal = orders
    .filter((o) => ['paid', 'shipped', 'completed'].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link to="/customers" className="hover:text-primary">客户列表</Link>
            <span className="mx-1">/</span>
            <span className="text-gray-800">客户详情</span>
          </nav>
          <h1 className="text-xl font-bold text-gray-800">客户详情</h1>
        </div>
        <div className="flex gap-2">
          <Link to={`/customers/${id}/edit`} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium">编辑</Link>
          <Link to="/customers" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">返回列表</Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100">
          <h2 className="font-semibold text-gray-800">基本信息</h2>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><dt className="text-gray-500 text-sm">姓名</dt><dd className="font-medium text-gray-800 mt-0.5">{customer.name}</dd></div>
          <div><dt className="text-gray-500 text-sm">手机号</dt><dd className="font-medium text-gray-800 mt-0.5">{customer.phone}</dd></div>
          <div><dt className="text-gray-500 text-sm">邮箱</dt><dd className="mt-0.5">{customer.email || '-'}</dd></div>
          <div><dt className="text-gray-500 text-sm">等级</dt><dd className="mt-0.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${levelClass[customer.level] || 'bg-gray-100'}`}>{customer.level_label || levelMap[customer.level] || customer.level}</span></dd></div>
          <div><dt className="text-gray-500 text-sm">状态</dt><dd className="mt-0.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${customer.status == 1 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{customer.status_label || (customer.status == 1 ? '启用' : '禁用')}</span></dd></div>
          <div><dt className="text-gray-500 text-sm">备注</dt><dd className="mt-0.5 text-gray-700">{customer.remark || '-'}</dd></div>
        </dl>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
          <p className="text-gray-500 text-sm">累计消费（统计值）</p>
          <p className="text-xl font-bold text-primary mt-1">¥{Number(customer.total_spent).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
          <p className="text-gray-500 text-sm">累计订单数（统计值）</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{customer.total_orders}</p>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
          <p className="text-gray-500 text-sm">有效订单金额（实时计算）</p>
          <p className="text-xl font-bold text-primary mt-1">¥{spentTotal.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-0.5">共 {orderTotal} 笔已付款/已发货/已完成</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100">
          <h2 className="font-semibold text-gray-800">历史订单（{orders.length} 笔）</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无订单</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">订单号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">金额</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">创建时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-orange-50/50">
                    <td className="px-4 py-3 text-sm font-medium">{o.order_no}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusClass[o.status] || 'bg-gray-100'}`}>{statusMap[o.status] || o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-primary font-medium">¥{Number(o.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3"><Link to={`/orders/${o.id}`} className="text-primary hover:underline text-sm">查看</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
