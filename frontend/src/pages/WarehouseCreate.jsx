import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getWarehouseCreateMeta, createWarehouse } from '../api'
import { useToast } from '../contexts/ToastContext'

export default function WarehouseCreate() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [meta, setMeta] = useState(null)
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    status: 1,
    is_default: false,
  })

  useEffect(() => {
    getWarehouseCreateMeta().then(setMeta).catch((e) => showToast(e.message))
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      showToast('请输入仓库名称')
      return
    }
    createWarehouse({
      ...form,
      status: Number(form.status),
      is_default: form.is_default ? 1 : 0,
    })
      .then(() => { showToast('仓库已创建', 'success'); navigate('/warehouses') })
      .catch((e) => showToast(e.message))
  }

  if (!meta) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/warehouses" className="hover:text-primary">仓库列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">新增仓库</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">新增仓库</h1>
        <p className="text-gray-600 text-base mt-1">填写仓库基本信息，用于库存和采购单关联</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-2xl">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">仓库名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={128} placeholder="请输入仓库名称" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">仓库编码</label>
            <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} maxLength={64} placeholder="请输入仓库编码" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">仓库地址</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={255} placeholder="请输入仓库地址" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">状态 <span className="text-red-500">*</span></label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              {Object.entries(meta.status_labels || {}).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_default"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="h-5 w-5 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="is_default" className="ml-2 block text-base font-semibold text-gray-800">
              设为默认仓库
            </label>
          </div>
        </div>
        <div className="mt-8 flex gap-3 pt-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base">保存</button>
          <button type="button" onClick={() => navigate('/warehouses')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base">取消</button>
        </div>
      </form>
    </div>
  )
}
