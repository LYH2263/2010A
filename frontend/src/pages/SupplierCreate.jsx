import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getSupplierCreateMeta, createSupplier } from '../api'
import { useToast } from '../contexts/ToastContext'

export default function SupplierCreate() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [meta, setMeta] = useState(null)
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    address: '',
    status: 1,
  })

  useEffect(() => {
    getSupplierCreateMeta().then(setMeta).catch((e) => showToast(e.message))
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      showToast('请输入供应商名称')
      return
    }
    createSupplier({
      ...form,
      status: Number(form.status),
    })
      .then(() => { showToast('供应商已创建', 'success'); navigate('/suppliers') })
      .catch((e) => showToast(e.message))
  }

  if (!meta) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/suppliers" className="hover:text-primary">供应商列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">新增供应商</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">新增供应商</h1>
        <p className="text-gray-600 text-base mt-1">填写供应商基本信息，用于采购单关联</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-2xl">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">供应商名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={128} placeholder="请输入供应商名称" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-1.5">联系人</label>
              <input type="text" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} maxLength={64} placeholder="请输入联系人姓名" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-1.5">联系电话</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={32} placeholder="请输入联系电话" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">地址</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={255} placeholder="请输入供应商地址" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">状态 <span className="text-red-500">*</span></label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              {Object.entries(meta.status_labels || {}).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-8 flex gap-3 pt-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base">保存</button>
          <button type="button" onClick={() => navigate('/suppliers')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base">取消</button>
        </div>
      </form>
    </div>
  )
}
