import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { getPurchaseOrder, submitPurchaseOrder, stockInPurchaseOrder, deletePurchaseOrder } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

function statusClass(status) {
  if (status == 0) return 'bg-gray-100 text-gray-700'
  if (status == 1) return 'bg-blue-100 text-blue-700'
  if (status == 2) return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-600'
}

function getSpecText(sku) {
  if (!sku) return ''
  if (sku.spec_text) return sku.spec_text
  if (sku.specValues && Array.isArray(sku.specValues)) {
    return sku.specValues.map(sv => `${sv.spec?.name}: ${sv.value}`).filter(Boolean).join(' / ')
  }
  return ''
}

function fmt(n) {
  return Number(n || 0).toFixed(2)
}

export default function PurchaseOrderShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    getPurchaseOrder(id)
      .then((o) => {
        setOrder(o)
      })
      .catch((e) => { setErr(e.message); showToast(e.message) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleSubmit = async () => {
    const ok = await confirm({
      title: '提交采购单',
      message: `确定提交采购单「${order.order_no}」？提交后状态变为「已提交」，可进行入库操作。`,
      confirmText: '确认提交',
      tone: 'primary',
    })
    if (!ok) return
    submitPurchaseOrder(id)
      .then(() => { showToast('采购单已提交', 'success'); load() })
      .catch((e) => showToast(e.message))
  }

  const handleStockIn = async () => {
    const ok = await confirm({
      title: '确认入库',
      message: `确定对采购单「${order.order_no}」执行入库？\n入库后将按明细增加对应商品库存，且入库后不可撤销、不可重复入库。`,
      confirmText: '确认入库',
      tone: 'success',
    })
    if (!ok) return
    stockInPurchaseOrder(id)
      .then(() => { showToast('入库成功，库存已更新', 'success'); load() })
      .catch((e) => showToast(e.message))
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: '删除采购单',
      message: `确定删除采购单「${order.order_no}」？只有草稿状态的采购单可删除。`,
      confirmText: '确认删除',
      tone: 'danger',
    })
    if (!ok) return
    deletePurchaseOrder(id)
      .then(() => { showToast('采购单已删除', 'success'); navigate('/purchase-orders') })
      .catch((e) => showToast(e.message))
  }

  if (err && !order) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!order || loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const isDraft = order.status == 0
  const isSubmitted = order.status == 1
  const isStocked = order.status == 2

  const items = order.items || []
  const totalQty = items.reduce((s, it) => s + Number(it.quantity || 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/purchase-orders" className="hover:text-primary">采购单列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">采购单详情</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">{order.order_no}</h1>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusClass(order.status)}`}>
                {order.status_label}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              供应商：<span className="font-medium text-gray-700">{order.supplier?.name || '-'}</span>
              {order.supplier?.contact_person && ` · 联系人：${order.supplier.contact_person}`}
              {order.supplier?.phone && ` · 电话：${order.supplier.phone}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <>
                <Link to={'/purchase-orders/' + id + '/edit'} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">编辑</Link>
                <button type="button" onClick={handleSubmit} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm">提交</button>
                <button type="button" onClick={handleDelete} className="bg-white border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium text-sm">删除</button>
              </>
            )}
            {isSubmitted && (
              <button type="button" onClick={handleStockIn} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm">确认入库</button>
            )}
            <Link to="/purchase-orders" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">返回列表</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">采购明细 ({items.length} 条 · {totalQty} 件)</h2>
            </div>
            {items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">无明细</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">商品</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">SKU / 规格</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">数量</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">单价</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">小计</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((it) => (
                      <tr key={it.id} className="hover:bg-orange-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{it.product?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {it.sku ? (
                            <div>
                              <div className="font-mono text-xs text-gray-500">{it.sku.sku}</div>
                              {getSpecText(it.sku) && <div className="text-xs mt-0.5">{getSpecText(it.sku)}</div>}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">{it.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm">¥{fmt(it.unit_price)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">¥{fmt(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan="4" className="px-4 py-3 text-right text-sm font-medium text-gray-700">采购总额</td>
                      <td className="px-4 py-3 text-right text-xl font-bold text-primary">¥{fmt(order.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {order.remark && (
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
              <div className="text-sm font-medium text-gray-500 mb-1.5">备注</div>
              <div className="text-gray-800 whitespace-pre-wrap">{order.remark}</div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow border border-gray-100 divide-y divide-gray-100">
            <div className="px-5 py-3 bg-gray-50">
              <h3 className="font-semibold text-gray-800">采购单信息</h3>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">采购单号</span>
                <span className="font-mono font-medium text-gray-800 text-right">{order.order_no}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">供应商</span>
                <span className="font-medium text-gray-800 text-right">{order.supplier?.name || '-'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">状态</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass(order.status)}`}>
                  {order.status_label}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">创建人</span>
                <span className="text-gray-800 text-right">{order.creator?.name || '-'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">创建时间</span>
                <span className="text-gray-800 text-right">{order.created_at ? order.created_at.slice(0, 16).replace('T', ' ') : '-'}</span>
              </div>
              {order.submitted_at && (
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 shrink-0">提交时间</span>
                  <span className="text-gray-800 text-right">{order.submitted_at.slice(0, 16).replace('T', ' ')}</span>
                </div>
              )}
              {order.stocked_at && (
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 shrink-0">入库时间</span>
                  <span className="text-gray-800 text-right">{order.stocked_at.slice(0, 16).replace('T', ' ')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-light to-orange-50 rounded-xl p-5 border border-primary/20">
            <div className="text-xs text-primary/70 mb-1">采购总额</div>
            <div className="text-3xl font-bold text-primary">¥{fmt(order.total_amount)}</div>
            <div className="mt-2 text-xs text-gray-600">共 {items.length} 条明细 · {totalQty} 件商品</div>
          </div>

          {isStocked && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-green-600 text-xl leading-none">✓</span>
              <div className="text-sm">
                <div className="font-medium text-green-800">已完成入库</div>
                <div className="text-green-700 text-xs mt-0.5">库存变动来源为「采购入库」，可在库存流水记录中查询</div>
              </div>
            </div>
          )}
          {isSubmitted && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-blue-600 text-xl leading-none">!</span>
              <div className="text-sm">
                <div className="font-medium text-blue-800">待入库</div>
                <div className="text-blue-700 text-xs mt-0.5">点击右上角「确认入库」按钮按明细增加商品库存</div>
              </div>
            </div>
          )}
          {isDraft && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-yellow-600 text-xl leading-none">i</span>
              <div className="text-sm">
                <div className="font-medium text-yellow-800">草稿状态</div>
                <div className="text-yellow-700 text-xs mt-0.5">可继续编辑或直接提交</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
