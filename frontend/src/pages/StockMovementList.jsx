import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getStockMovements, getProducts } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'

const PER_PAGE = 15

export default function StockMovementList() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(1)
  const [products, setProducts] = useState([])
  const [keyword, setKeyword] = useState('')
  const [filterProductId, setFilterProductId] = useState(productId || '')
  const [sourceType, setSourceType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [appliedProductId, setAppliedProductId] = useState(productId || '')
  const [appliedSourceType, setAppliedSourceType] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (appliedKeyword) params.keyword = appliedKeyword
    if (appliedProductId) params.product_id = appliedProductId
    if (appliedSourceType) params.source_type = appliedSourceType
    if (appliedDateFrom) params.date_from = appliedDateFrom
    if (appliedDateTo) params.date_to = appliedDateTo
    return getStockMovements(params).then(setData).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => {
    getProducts({ per_page: 100 }).then((d) => {
      const list = d?.products?.data ?? d?.data ?? []
      setProducts(Array.isArray(list) ? list : [])
    }).catch(() => setProducts([]))
  }, [])

  useEffect(() => { load(page) }, [page, appliedKeyword, appliedProductId, appliedSourceType, appliedDateFrom, appliedDateTo])

  const handleSearch = (e) => {
    e?.preventDefault()
    setAppliedKeyword(keyword.trim())
    setAppliedProductId(filterProductId)
    setAppliedSourceType(sourceType)
    setAppliedDateFrom(dateFrom)
    setAppliedDateTo(dateTo)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setFilterProductId(productId || '')
    setSourceType('')
    setDateFrom('')
    setDateTo('')
    setAppliedKeyword('')
    setAppliedProductId(productId || '')
    setAppliedSourceType('')
    setAppliedDateFrom('')
    setAppliedDateTo('')
    setPage(1)
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const paginator = data.movements
  const movements = paginator?.data ?? (Array.isArray(data.movements) ? data.movements : [])
  const sourceTypes = data.source_types ?? {}
  const total = paginator?.total ?? movements.length
  const currentPage = paginator?.current_page ?? 1
  const lastPage = paginator?.last_page ?? 1

  const relatedLink = (m) => {
    if (!m.related_type || !m.related_id) return '-'
    if (m.related_type === 'order') {
      return <Link to={'/orders/' + m.related_id} className="text-primary hover:underline">订单 #{m.related_id}</Link>
    }
    if (m.related_type === 'refund') {
      return <Link to={'/refunds/' + m.related_id} className="text-primary hover:underline">退款 #{m.related_id}</Link>
    }
    return `${m.related_type} #${m.related_id}`
  }

  const deltaClass = (delta) => delta > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
  const deltaSign = (delta) => delta > 0 ? '+' : ''

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">库存流水</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看所有库存变动记录，支持按商品、来源、时间筛选</p>
        </div>
        <div className="flex gap-2">
          {productId && (
            <button onClick={() => navigate(-1)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">返回</button>
          )}
          <Link to="/inventory" className="bg-white border border-primary text-primary hover:bg-primary-light px-4 py-2 rounded-lg font-medium text-sm">返回库存列表</Link>
        </div>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">商品名称 / SKU</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入商品名称或 SKU"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">商品</span>
          <select
            value={filterProductId}
            onChange={(e) => setFilterProductId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          >
            <option value="">全部商品</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}（{p.sku}）</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">来源类型</span>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          >
            <option value="">全部来源</option>
            {Object.entries(sourceTypes).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">开始日期</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">结束日期</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">查询</button>
          <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {movements.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无库存流水记录</p>
            <p className="text-sm mt-1">库存变动后会在此显示</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">来源类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">变动前</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">变动值</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">变动后</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">关联单据</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作人</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">原因</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{m.id}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{m.product?.name ?? '-'}</div>
                        <div className="text-gray-500 text-xs">{m.product?.sku ?? ''}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{m.source_type_label ?? m.source_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{m.before_quantity}</td>
                      <td className={`px-4 py-3 text-sm ${deltaClass(m.delta)}`}>{deltaSign(m.delta)}{m.delta}</td>
                      <td className="px-4 py-3 text-sm font-medium">{m.after_quantity}</td>
                      <td className="px-4 py-3 text-sm">{relatedLink(m)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{m.operator?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={m.reason ?? ''}>{m.reason ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 条记录{(appliedKeyword || appliedProductId || appliedSourceType || appliedDateFrom || appliedDateTo) ? '（当前筛选）' : ''}</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
