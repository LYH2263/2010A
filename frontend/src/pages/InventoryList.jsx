import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getInventory, getCategoriesAll } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'

const PER_PAGE = 15

export default function InventoryList() {
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [appliedCategoryId, setAppliedCategoryId] = useState('')
  const [appliedLowStockOnly, setAppliedLowStockOnly] = useState(false)

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (appliedKeyword) params.keyword = appliedKeyword
    if (appliedCategoryId) params.category_id = appliedCategoryId
    if (appliedLowStockOnly) params.low_stock = '1'
    return getInventory(params).then(setData).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { getCategoriesAll().then(setCategories).catch(() => setCategories([])) }, [])
  useEffect(() => { load(page) }, [page, appliedKeyword, appliedCategoryId, appliedLowStockOnly])

  const handleSearch = (e) => {
    e?.preventDefault()
    setAppliedKeyword(keyword.trim())
    setAppliedCategoryId(categoryId)
    setAppliedLowStockOnly(lowStockOnly)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setCategoryId('')
    setLowStockOnly(false)
    setAppliedKeyword('')
    setAppliedCategoryId('')
    setAppliedLowStockOnly(false)
    setPage(1)
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const paginator = data.products
  const products = paginator?.data ?? (Array.isArray(data.products) ? data.products : [])
  const stats = data.stats ?? {}
  const lowStockList = products.filter((p) => p.stock <= 10)
  const total = paginator?.total ?? products.length
  const currentPage = paginator?.current_page ?? 1
  const lastPage = paginator?.last_page ?? 1

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">库存管理</h1>
        <p className="text-gray-500 text-sm mt-0.5">查看与调整商品库存，关注低库存商品避免缺货</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <p className="text-gray-500 text-sm">库存总量</p>
          <p className="text-2xl font-bold text-primary mt-1">{stats.total_stock ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">当前所有商品库存件数合计</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <p className="text-gray-500 text-sm">库存总价值</p>
          <p className="text-2xl font-bold text-primary mt-1">¥{Number(stats.total_value ?? 0).toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">按当前单价×库存估算</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <p className="text-gray-500 text-sm">低库存商品数（≤10）</p>
          <p className={`text-2xl font-bold mt-1 ${(stats.low_stock_count ?? 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>{stats.low_stock_count ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">建议及时补货</p>
        </div>
      </div>

      {lowStockList.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="font-semibold text-amber-800 mb-2">低库存提醒</h2>
          <p className="text-sm text-amber-700 mb-3">以下商品库存 ≤ 10，可点击「调整库存」进行入库。</p>
          <div className="flex flex-wrap gap-2">
            {lowStockList.map((p) => (
              <Link key={p.id} to={'/inventory/' + p.id + '/adjust'} state={{ from: 'list' }} className="inline-flex items-center px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-sm text-amber-800 hover:bg-amber-100">
                {p.name}（{p.stock}）
              </Link>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">商品名称 / SKU</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入商品名称或 SKU 筛选"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">分类</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          >
            <option value="">全部</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 h-[42px]">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-600">仅低库存（≤10）</span>
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">查询</button>
          <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {products.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无商品</p>
            <p className="text-sm mt-1">先添加商品后即可在此查看与调整库存</p>
            <Link to="/products/create" className="inline-block mt-4 text-primary hover:underline">去新增商品</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">单价</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">当前库存</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((p) => (
                    <tr key={p.id} className={p.stock <= 10 ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-orange-50'}>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.id}</td>
                      <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-sm">{p.sku}</td>
                      <td className="px-4 py-3 text-sm text-primary font-medium">¥{Number(p.price ?? 0).toFixed(2)}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${p.stock <= 10 ? 'text-orange-600' : ''}`}>{p.stock}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <Link to={'/inventory/' + p.id + '/adjust'} state={{ from: 'list' }} className="text-primary hover:underline">调整库存</Link>
                          <Link to={'/inventory/movements/' + p.id} className="text-primary hover:underline">查看流水</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm text-gray-500">共 {total} 件商品{(appliedKeyword || appliedCategoryId || appliedLowStockOnly) ? '（当前筛选）' : ''}</span>
            <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
          </div>
          </>
        )}
      </div>
    </div>
  )
}
