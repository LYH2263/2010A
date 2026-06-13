import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { getProduct, updateProduct } from '../api'
import { getCategoriesAll } from '../api'
import { useToast } from '../contexts/ToastContext'

export default function ProductEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const fromDetail = location.state?.from === 'detail'
  const backTo = () => (fromDetail ? navigate('/products/' + id) : navigate('/products'))
  const [categories, setCategories] = useState([])
  const [product, setProduct] = useState(null)
  const [err, setErr] = useState(null)
  const [form, setForm] = useState(null)

  const load = () => Promise.all([getProduct(id), getCategoriesAll()])
    .then(([p, cats]) => {
      setProduct(p)
      setCategories(cats)
      setForm({ name: p.name, sku: p.sku, category_id: p.category_id || '', price: p.price, stock: p.stock, status: p.status })
    })
    .catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [id])

  const handleSubmit = (e) => {
    e.preventDefault()
    updateProduct(id, {
      name: form.name,
      sku: form.sku,
      category_id: form.category_id || null,
      price: form.price,
      stock: form.stock,
      status: Number(form.status),
    })
      .then(() => { showToast('商品已保存', 'success'); backTo() })
      .catch((e) => showToast(e.message))
  }

  if (err && !product) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!form) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/products" className="hover:text-primary">商品列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">编辑</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">编辑商品</h1>
        <p className="text-gray-600 text-base mt-1">修改商品信息后保存，库存可在库存管理中单独调整</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-xl">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">分类</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value="">-- 请选择 --</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">商品名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="请输入商品名称" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">SKU <span className="text-red-500">*</span></label>
            <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="请输入 SKU 编号" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">单价 <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required placeholder="0.00" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">库存</label>
            <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">状态</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value={1}>上架</option>
              <option value={0}>下架</option>
            </select>
          </div>
        </div>
        <div className="mt-8 flex gap-3 pt-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base">保存</button>
          <button type="button" onClick={backTo} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base">取消</button>
        </div>
      </form>
    </div>
  )
}
