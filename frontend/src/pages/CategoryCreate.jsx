import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createCategory } from '../api'
import { useToast } from '../contexts/ToastContext'

export default function CategoryCreate() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState({ name: '', slug: '', sort_order: 0 })

  const handleSubmit = (e) => {
    e.preventDefault()
    createCategory(form)
      .then(() => { showToast('分类已创建', 'success'); navigate('/categories') })
      .catch((e) => showToast(e.message))
  }

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/categories" className="hover:text-primary">分类列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">新增分类</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">新增分类</h1>
        <p className="text-gray-600 text-base mt-1">分类用于对商品进行归类，创建后可在商品中选择该分类</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-xl">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="如：数码电子" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">标识 (slug)</label>
            <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="留空将根据名称自动生成" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">排序</label>
            <input type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
            <p className="text-gray-500 text-sm mt-1.5">数字越小越靠前</p>
          </div>
        </div>
        <div className="mt-8 flex gap-3 pt-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base">保存</button>
          <button type="button" onClick={() => navigate('/categories')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base">取消</button>
        </div>
      </form>
    </div>
  )
}
