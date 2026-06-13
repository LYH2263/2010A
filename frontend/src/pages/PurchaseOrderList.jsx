import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPurchaseOrders, deletePurchaseOrder, submitPurchaseOrder, stockInPurchaseOrder, getSuppliersActive } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const PER_PAGE = 10

function statusClass(status) {
  if (status == 0) return 'bg-gray-100 text-gray-600'
  if (status == 1) return 'bg-blue-100 text-blue-700'
  if (status == 2) return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-600'
}

export default function PurchaseOrderList() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [res, setRes] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [statusLabels, setStatusLabels] = useState({})
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchParams, setSearchParams] = useState({})

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p, ...searchParams }
    getPurchaseOrders(params)
      .then((data) => {
        setRes(data.purchase_orders || data)
        if (data.status_labels) setStatusLabels(data.status_labels)
      })
      .catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => {
    getSuppliersActive().then(setSuppliers).catch(() => {})
  }, [])

  useEffect(() => { load(page) }, [page, searchParams])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = {}
    if (keyword.trim()) params.keyword = keyword.trim()
    if (supplierFilter) params.supplier_id = supplierFilter
    if (statusFilter !== '') params.status = statusFilter
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    setSearchParams(params)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword(''); setSupplierFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('')
    setSearchParams({})
    setPage(1)
  }

  const handleSubmit = async (id, orderNo) => {
    const ok = await confirm({
      title: '提交采购单',
      message: `确定提交采购单「${orderNo}」？提交后状态变为「已提交」，可进行入库操作。`,
      confirmText: '确认提交',
      tone: 'primary',
    })
    if (!ok) return
    submitPurchaseOrder(id)
      .then(() => { showToast('采购单已提交', 'success'); load(page) })
      .catch((e) => showToast(e.message))
  }

  const handleStockIn = async (id, orderNo) => {
    const ok = await confirm({
      title: '确认入库',
      message: `确定对采购单「${orderNo}」执行入库？入库后将按明细增加对应商品库存，且入库后不可撤销。`,
      confirmText: '确认入库',
      tone: 'success',
    })
    if (!ok) return
    stockInPurchaseOrder(id)
      .then(() => { showToast('入库成功，库存已更新', 'success'); load(page) })
      .catch((e) => showToast(e.message))
  }

  const handleDelete = async (id, orderNo) => {
    const ok = await confirm({
      title: '删除采购单',
      message: `确定删除采购单「${orderNo}」？只有草稿状态的采购单可删除。`,
      confirmText: '确认删除',
      tone: 'danger',
    })
    if (!ok) return
    deletePurchaseOrder(id)
      .then(() => { showToast('采购单已删除', 'success'); load(page) })
      .catch((e) => showToast(e.message))
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const list = res.data ?? res
  const total = res.total ?? list.length
  const currentPage = res.current_page ?? 1
  const lastPage = res.last_page ?? 1

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">采购单管理</h1>
          <p className="text-gray-500 text-sm mt-0.5">创建采购单向供应商采购商品，确认入库后库存自动增加</p>
        </div>
        <Link to="/purchase-orders/create" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shrink-0">新建采购单</Link>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
          <div>
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索单号 / 供应商" className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value="">全部供应商</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value="">全部状态</option>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">搜索</button>
          <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无采购单</p>
            <p className="text-sm mt-1">新建采购单以记录向供应商的采购</p>
            <Link to="/purchase-orders/create" className="inline-block mt-4 text-primary hover:underline">去新建采购单</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">采购单号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">供应商</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">采购总额</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">创建人</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">创建时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((o) => (
                    <tr key={o.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm font-mono">{o.order_no}</td>
                      <td className="px-4 py-3 text-sm">{o.supplier?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">¥{Number(o.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(o.status)}`}>
                          {o.status_label || statusLabels[o.status] || o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{o.creator?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{o.created_at ? o.created_at.slice(0, 16).replace('T', ' ') : '-'}</td>
                      <td className="px-4 py-3 text-sm space-x-1 whitespace-nowrap">
                        <Link to={'/purchase-orders/' + o.id} className="text-primary hover:underline">详情</Link>
                        {o.status == 0 && (
                          <>
                            <Link to={'/purchase-orders/' + o.id + '/edit'} className="text-primary hover:underline ml-2">编辑</Link>
                            <button type="button" onClick={() => handleSubmit(o.id, o.order_no)} className="text-blue-600 hover:underline ml-2">提交</button>
                            <button type="button" onClick={() => handleDelete(o.id, o.order_no)} className="text-red-600 hover:underline ml-2">删除</button>
                          </>
                        )}
                        {o.status == 1 && (
                          <button type="button" onClick={() => handleStockIn(o.id, o.order_no)} className="text-green-600 hover:underline ml-2 font-medium">确认入库</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 条采购单</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
