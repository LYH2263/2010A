import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getCouponEditMeta, updateCoupon } from '../api'
import { useToast } from '../contexts/ToastContext'

function formatDateForInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

export default function CouponEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'fixed',
    value: '',
    min_amount: '',
    valid_from: '',
    valid_until: '',
    total_quantity: 100,
    category_ids: [],
    status: 'active',
    description: '',
  })
  const [initialUsedQty, setInitialUsedQty] = useState(0)

  const load = () => {
    setLoading(true)
    getCouponEditMeta(id)
      .then((data) => {
        setCategories(data.categories || [])
        const c = data.coupon
        if (!c) {
          setNotFound(true)
          return
        }
        setForm({
          code: c.code || '',
          name: c.name || '',
          type: c.type || 'fixed',
          value: String(c.value ?? ''),
          min_amount: c.min_amount != null ? String(c.min_amount) : '',
          valid_from: formatDateForInput(c.valid_from),
          valid_until: formatDateForInput(c.valid_until),
          total_quantity: Number(c.total_quantity) || 1,
          category_ids: Array.isArray(c.category_ids) ? c.category_ids : [],
          status: c.status || 'active',
          description: c.description || '',
        })
        setInitialUsedQty(Number(c.used_quantity) || 0)
      })
      .catch((e) => {
        if (e.message && e.message.includes('404')) {
          setNotFound(true)
        } else {
          showToast(e.message)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const toggleCategory = (cid) => {
    setForm((prev) => {
      const cur = prev.category_ids || []
      const next = cur.includes(cid) ? cur.filter((x) => x !== cid) : [...cur, cid]
      return { ...prev, category_ids: next }
    })
  }

  const selectAllCategories = () => update('category_ids', categories.map((c) => c.id))
  const clearCategorySelection = () => update('category_ids', [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) { showToast('请输入券名称'); return }
    if (form.value === '' || Number(form.value) <= 0) { showToast('请输入有效的面额/折扣率'); return }
    if (form.type === 'percent' && Number(form.value) > 100) { showToast('折扣率不能大于 100'); return }
    if (!form.valid_from) { showToast('请选择有效期开始'); return }
    if (!form.valid_until) { showToast('请选择有效期结束'); return }
    if (new Date(form.valid_until) <= new Date(form.valid_from)) { showToast('有效期结束必须晚于开始'); return }
    const totalQty = Number(form.total_quantity) || 0
    if (totalQty < 1) { showToast('发行总量至少为 1'); return }
    if (totalQty < initialUsedQty) { showToast(`发行总量不能少于已用数量 ${initialUsedQty}`); return }

    const payload = {
      ...form,
      value: Number(form.value),
      min_amount: form.min_amount === '' ? 0 : Number(form.min_amount),
      total_quantity: totalQty,
      category_ids: form.category_ids.length === 0 ? null : form.category_ids,
    }

    setSubmitting(true)
    updateCoupon(id, payload)
      .then(() => { showToast('优惠券已更新', 'success'); navigate('/coupons') })
      .catch((e) => showToast(e.message))
      .finally(() => setSubmitting(false))
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>
  if (notFound) return <div className="p-4 text-center text-gray-600">优惠券不存在，<Link to="/coupons" className="text-primary hover:underline">返回列表</Link></div>

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/coupons" className="hover:text-primary">优惠券管理</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">编辑优惠券</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">编辑优惠券</h1>
        <p className="text-gray-600 text-base mt-1">修改优惠券配置（券码不可修改）</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-3xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">券码（不可修改）</label>
            <input
              type="text"
              value={form.code}
              disabled
              className="block w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-base text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">已使用 {initialUsedQty} 张</p>
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">券名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              maxLength={128}
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">券类型 <span className="text-red-500">*</span></label>
            <select
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="fixed">满减券（减固定金额）</option>
              <option value="percent">折扣券（按比例折扣）</option>
            </select>
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">
              {form.type === 'fixed' ? '面额（元）' : '折扣率（0~100）'} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step={form.type === 'fixed' ? '0.01' : '0.1'}
              min="0"
              max={form.type === 'percent' ? '100' : undefined}
              value={form.value}
              onChange={(e) => update('value', e.target.value)}
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
            {form.type === 'percent' && <p className="text-xs text-gray-400 mt-1">输入 85 表示八五折</p>}
          </div>
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-800 mb-1.5">使用门槛（元）</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.min_amount}
            onChange={(e) => update('min_amount', e.target.value)}
            placeholder="0 表示无门槛"
            className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">有效期开始 <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              value={form.valid_from}
              onChange={(e) => update('valid_from', e.target.value)}
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">有效期结束 <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              value={form.valid_until}
              onChange={(e) => update('valid_until', e.target.value)}
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-800 mb-1.5">
            发行总量 <span className="text-red-500">*</span>
            <span className="text-xs text-gray-400 font-normal ml-2">（已用 {initialUsedQty}，不能低于此值）</span>
          </label>
          <input
            type="number"
            min={Math.max(1, initialUsedQty)}
            step="1"
            value={form.total_quantity}
            onChange={(e) => update('total_quantity', e.target.value)}
            className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-base font-semibold text-gray-800">适用商品分类</label>
            <div className="flex gap-2">
              <button type="button" onClick={selectAllCategories} className="text-xs text-primary hover:underline">全选</button>
              <span className="text-gray-300">|</span>
              <button type="button" onClick={clearCategorySelection} className="text-xs text-gray-500 hover:underline">清空（全部适用）</button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-2">不选择 = 全部商品可用</p>
          {categories.length === 0 ? (
            <div className="text-sm text-gray-400 italic">暂无分类</div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50/50">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={(form.category_ids || []).includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{c.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-800 mb-1.5">描述</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            maxLength={500}
            className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>

        <div className="mt-2 flex gap-3 pt-2 border-t border-gray-100">
          <button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base disabled:opacity-50">
            {submitting ? '保存中...' : '保存修改'}
          </button>
          <button type="button" onClick={() => navigate('/coupons')} disabled={submitting} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base disabled:opacity-50">取消</button>
        </div>
      </form>
    </div>
  )
}
