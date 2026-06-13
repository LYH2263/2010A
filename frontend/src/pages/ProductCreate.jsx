import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createProduct } from '../api'
import { getCategoriesAll } from '../api'
import { useToast } from '../contexts/ToastContext'

export default function ProductCreate() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ name: '', sku: '', category_id: '', price: '', stock: 0, status: 1 })

  useEffect(() => {
    getCategoriesAll().then(setCategories).catch(() => setCategories([]))
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      sku: form.sku,
      category_id: form.category_id || null,
      price: form.price,
      stock: form.stock ?? 0,
      status: Number(form.status),
    }
    createProduct(payload)
      .then(() => { showToast('商品已创建', 'success'); navigate('/products') })
      .catch((e) => showToast(e.message))
  }

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/products" className="hover:text-primary">商品列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">新增商品</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">新增商品</h1>
        <p className="text-gray-600 text-base mt-1">填写商品名称、SKU、分类与价格等信息后保存</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-xl">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">分类</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value="">-- 请选择 --</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">商品名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="请输入商品名称" className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">SKU <span className="text-red-500">*</span></label>
            <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="请输入 SKU 编号" className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">单价 <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required placeholder="0.00" className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">库存</label>
            <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">状态</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value={1}>上架</option>
              <option value={0}>下架</option>
            </select>
          </div>
        </div>
        <div className="mt-8 flex gap-3 pt-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base">保存</button>
          <button type="button" onClick={() => navigate('/products')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base">取消</button>
        </div>
      </form>
    </div>
  )
}
