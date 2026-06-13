import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getCustomerCreateMeta, createCustomer } from '../api'
import { useToast } from '../contexts/ToastContext'

export default function CustomerCreate() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [statusLabels, setStatusLabels] = useState({})
  const [levelLabels, setLevelLabels] = useState({})
  const [form, setForm] = useState({ name: '', phone: '', email: '', level: 'normal', remark: '', status: 1 })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getCustomerCreateMeta().then((data) => {
      if (data.status_labels) setStatusLabels(data.status_labels)
      if (data.level_labels) setLevelLabels(data.level_labels)
    }).catch(() => {})
  }, [])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: null }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitting(true)
    createCustomer(form)
      .then((customer) => {
        showToast('客户已创建', 'success')
        navigate('/customers/' + customer.id)
      })
      .catch((err) => {
        const msg = err.message || '创建失败'
        try {
          const parsed = JSON.parse(msg)
          if (typeof parsed === 'object') {
            setErrors(parsed)
            return
          }
        } catch (_) {}
        showToast(msg)
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/customers" className="hover:text-primary">客户列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">新增客户</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">新增客户</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-2xl">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">姓名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} maxLength={64} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="请输入姓名" />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">手机号 <span className="text-red-500">*</span></label>
            <input type="text" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} maxLength={20} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="请输入11位手机号" />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">邮箱</label>
            <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} maxLength={128} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="选填" />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">等级</label>
            <select value={form.level} onChange={(e) => handleChange('level', e.target.value)} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              {Object.entries(levelLabels).length > 0 ? Object.entries(levelLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              )) : (
                <option value="normal">普通</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">状态</label>
            <select value={form.status} onChange={(e) => handleChange('status', Number(e.target.value))} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              {Object.entries(statusLabels).length > 0 ? Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              )) : (
                <>
                  <option value={1}>启用</option>
                  <option value={0}>禁用</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">备注</label>
            <textarea value={form.remark} onChange={(e) => handleChange('remark', e.target.value)} maxLength={500} rows={3} className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="选填" />
          </div>
        </div>

        <div className="mt-8 flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base disabled:opacity-50">
            {submitting ? '提交中...' : '创建客户'}
          </button>
          <button type="button" onClick={() => navigate('/customers')} disabled={submitting} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base disabled:opacity-50">取消</button>
        </div>
      </form>
    </div>
  )
}
