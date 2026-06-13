import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { getCategories, updateCategory } from '../api'
import { useToast } from '../contexts/ToastContext'

export default function CategoryEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [category, setCategory] = useState(null)
  const [err, setErr] = useState(null)
  const [form, setForm] = useState(null)

  const load = () => getCategories().then((res) => {
    const list = res.data ?? res
    const c = list.find((x) => String(x.id) === String(id))
    if (c) {
      setCategory(c)
      setForm({ name: c.name, slug: c.slug ?? '', sort_order: c.sort_order ?? 0 })
    } else { setErr('分类不存在'); showToast('分类不存在') }
  }).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [id])

  const handleSubmit = (e) => {
    e.preventDefault()
    updateCategory(id, form)
      .then(() => { showToast('分类已保存', 'success'); navigate('/categories') })
      .catch((e) => showToast(e.message))
  }

  if (err && !category) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!form) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/categories" className="hover:text-primary">分类列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">编辑</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">编辑分类</h1>
        <p className="text-gray-600 text-base mt-1">修改分类名称、标识或排序后保存</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-xl">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="请输入分类名称" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">标识 (slug)</label>
            <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="如：clothing、digital" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">排序</label>
            <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} min="0" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
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
