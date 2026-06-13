import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, getCategoriesAll, deleteProduct, resolveImageUrl } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const PER_PAGE = 15

export default function ProductList() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [categories, setCategories] = useState([])
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [appliedCategoryId, setAppliedCategoryId] = useState('')

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (appliedCategoryId) params.category_id = appliedCategoryId
    if (appliedKeyword) params.keyword = appliedKeyword
    return getProducts(params).then(setRes).catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => {
    getCategoriesAll().then(setCategories).catch(() => setCategories([]))
  }, [])
  useEffect(() => { load(page) }, [page, appliedCategoryId, appliedKeyword])

  const handleSearch = (e) => {
    e?.preventDefault()
    setAppliedKeyword(keyword.trim())
    setAppliedCategoryId(categoryId)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setCategoryId('')
    setAppliedKeyword('')
    setAppliedCategoryId('')
    setPage(1)
  }

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: '删除商品',
      message: `确定删除「${name}」？删除后不可恢复。`,
      confirmText: '确认删除',
      tone: 'danger',
    })
    if (!ok) return
    deleteProduct(id).then(() => { showToast('商品已删除', 'success'); load(page) }).catch((e) => showToast(e.message))
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
          <h1 className="text-xl font-bold text-gray-800">商品列表</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理全部商品，支持按分类筛选与搜索名称/SKU</p>
        </div>
        <Link to="/products/create" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shrink-0">新增商品</Link>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">商品名称 / SKU</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索商品名称或 SKU"
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
            <option value="">全部分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">查询</button>
          <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无商品</p>
            <p className="text-sm mt-1">添加分类后即可创建商品</p>
            <Link to="/products/create" className="inline-block mt-4 text-primary hover:underline">去新增商品</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-16">图片</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">商品编码</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">分类</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">价格</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">库存</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((p) => {
                    const hasMultiSku = p.skus && p.skus.length > 1
                    const minPrice = hasMultiSku ? Math.min(...p.skus.map(s => Number(s.price))) : Number(p.price)
                    const maxPrice = hasMultiSku ? Math.max(...p.skus.map(s => Number(s.price))) : Number(p.price)
                    const totalStock = hasMultiSku ? p.skus.reduce((sum, s) => sum + Number(s.stock), 0) : Number(p.stock)
                    const priceText = minPrice === maxPrice ? `¥${minPrice.toFixed(2)}` : `¥${minPrice.toFixed(2)} ~ ¥${maxPrice.toFixed(2)}`

                    return (
                      <tr key={p.id} className="hover:bg-orange-50">
                        <td className="px-4 py-3">
                          {p.main_image_url || p.main_image_thumbnail ? (
                            <img
                              src={resolveImageUrl(p.main_image_url || p.main_image_thumbnail)}
                              alt={p.name}
                              className="w-12 h-12 object-cover rounded border border-gray-200 bg-white"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300 text-xs">
                              无图
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{p.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div>{p.name}</div>
                          {hasMultiSku && <div className="text-xs text-gray-400 mt-0.5">{p.skus.length} 个 SKU</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p.sku}</td>
                        <td className="px-4 py-3 text-sm">{p.category?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-sm text-primary font-medium">{priceText}</td>
                        <td className="px-4 py-3 text-sm">{totalStock}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${p.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{p.status ? '上架' : '下架'}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link to={'/products/' + p.id} className="text-primary hover:underline">详情</Link>
                          <Link to={'/products/' + p.id + '/edit'} state={{ from: 'list' }} className="text-primary hover:underline ml-2">编辑</Link>
                          <button type="button" onClick={() => handleDelete(p.id, p.name)} className="text-red-600 hover:underline ml-2">删除</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 件商品{(appliedKeyword || appliedCategoryId) ? '（当前筛选）' : ''}</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
