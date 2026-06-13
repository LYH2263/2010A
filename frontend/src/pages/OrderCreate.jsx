import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getProductsOnSale, createOrder, validateCoupon } from '../api'
import { useToast } from '../contexts/ToastContext'

function getSpecText(sku) {
  if (!sku) return ''
  if (sku.spec_text) return sku.spec_text
  if (sku.spec_values) {
    return Object.entries(sku.spec_values).map(([k, v]) => `${k}: ${v}`).join(' / ')
  }
  if (sku.specValues && Array.isArray(sku.specValues)) {
    return sku.specValues.map(sv => `${sv.spec?.name}: ${sv.value}`).filter(Boolean).join(' / ')
  }
  return ''
}

export default function OrderCreate() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [remark, setRemark] = useState('')
  const [err, setErr] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [couponCode, setCouponCode] = useState('')
  const [couponValidation, setCouponValidation] = useState(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const debounceRef = useRef(null)

  const load = () => getProductsOnSale().then((data) => {
    setProducts(Array.isArray(data) ? data : (data.data ?? []))
  }).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [])

  const handleQtyChange = (productId, skuId, value) => {
    const key = `${productId}_${skuId}`
    setQuantities({ ...quantities, [key]: value })
  }

  const getQty = (productId, skuId) => {
    const key = `${productId}_${skuId}`
    return quantities[key] ?? 0
  }

  const buildOrderItems = () => {
    const items = []
    products.forEach((p) => {
      const hasMultiSku = p.skus && p.skus.length > 1
      if (hasMultiSku) {
        p.skus.forEach((sku) => {
          const qty = Number(getQty(p.id, sku.id))
          if (qty > 0) {
            items.push({ product_id: p.id, product_sku_id: sku.id, quantity: qty })
          }
        })
      } else {
        const skuId = p.skus && p.skus[0]?.id
        const qty = Number(getQty(p.id, skuId || 'default'))
        if (qty > 0) {
          const item = { product_id: p.id, quantity: qty }
          if (skuId) item.product_sku_id = skuId
          items.push(item)
        }
      }
    })
    return items
  }

  const computeTotals = useMemo(() => {
    let originalAmount = 0
    const items = buildOrderItems()
    products.forEach((p) => {
      const hasMultiSku = p.skus && p.skus.length > 1
      if (hasMultiSku) {
        p.skus.forEach((sku) => {
          const qty = Number(getQty(p.id, sku.id))
          if (qty > 0) {
            originalAmount += Number(sku.price) * qty
          }
        })
      } else {
        const skuId = p.skus?.[0]?.id
        const price = p.skus?.[0]?.price ?? p.price
        const qty = Number(getQty(p.id, skuId || 'default'))
        if (qty > 0) {
          originalAmount += Number(price) * qty
        }
      }
    })
    return { originalAmount: originalAmount.toFixed(2), itemsCount: items.length }
  }, [quantities, products])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const code = couponCode.trim()
    if (!code) {
      setCouponValidation(null)
      return
    }
    const items = buildOrderItems()
    if (items.length === 0) {
      setCouponValidation({ valid: false, message: '请先选择商品后再使用优惠券' })
      return
    }
    setValidatingCoupon(true)
    debounceRef.current = setTimeout(() => {
      validateCoupon(code, items)
        .then((res) => setCouponValidation(res))
        .catch((e) => setCouponValidation({ valid: false, message: e.message }))
        .finally(() => setValidatingCoupon(false))
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [couponCode, quantities, products])

  const finalDisplay = useMemo(() => {
    const original = Number(computeTotals.originalAmount)
    let discount = 0
    let payable = original
    let couponInfo = null
    if (couponValidation && couponValidation.valid) {
      discount = Number(couponValidation.discount_amount) || 0
      payable = Number(couponValidation.payable_amount) || (original - discount)
      if (payable < 0) payable = 0
      couponInfo = couponValidation.coupon
    }
    return {
      original: original.toFixed(2),
      discount: discount.toFixed(2),
      payable: payable.toFixed(2),
      couponInfo,
    }
  }, [computeTotals, couponValidation])

  const handleSubmit = (e) => {
    e.preventDefault()
    const items = buildOrderItems()
    if (items.length === 0) {
      showToast('请至少选择一件商品并填写数量')
      return
    }
    const payload = { items, remark }
    const code = couponCode.trim()
    if (code) {
      if (!couponValidation || !couponValidation.valid) {
        showToast(couponValidation?.message || '优惠券不可用')
        return
      }
      payload.coupon_code = code
    }
    setSubmitting(true)
    createOrder(payload)
      .then((order) => { showToast('订单已创建', 'success'); navigate('/orders/' + order.id) })
      .catch((e) => showToast(e.message))
      .finally(() => setSubmitting(false))
  }

  if (err && !products.length) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/orders" className="hover:text-primary">订单列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">创建订单</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">创建订单</h1>
        <p className="text-gray-600 text-base mt-1">选择商品并填写数量，可使用优惠券</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-4xl">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-2">选择商品与数量</label>
            <div className="space-y-4">
              {products.map((p) => {
                const hasMultiSku = p.skus && p.skus.length > 1
                return (
                  <div key={p.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="flex-1 min-w-0 text-base font-medium text-gray-800">{p.name}</span>
                      <span className="text-gray-500 text-sm">商品编码：{p.sku}</span>
                    </div>

                    {hasMultiSku ? (
                      <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-100">
                        {p.skus.map((sku) => (
                          <div key={sku.id} className="flex flex-wrap items-center gap-3 py-1.5">
                            <span className="flex-1 min-w-0 text-sm text-gray-600">
                              <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs mr-2">{sku.sku}</span>
                              {getSpecText(sku)}
                            </span>
                            <span className="text-primary font-medium text-sm">¥{Number(sku.price).toFixed(2)}</span>
                            <span className="text-gray-500 text-xs">库存 {sku.stock}</span>
                            <input
                              type="number"
                              min="0"
                              max={sku.stock}
                              value={getQty(p.id, sku.id)}
                              onChange={(e) => handleQtyChange(p.id, sku.id, e.target.value)}
                              placeholder="0"
                              className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            />
                            <span className="text-gray-500 text-xs">件</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <span className="flex-1 min-w-0 text-sm text-gray-500">
                          {p.skus?.[0]?.sku ? `SKU：${p.skus[0].sku}` : ''}
                        </span>
                        <span className="text-primary font-medium text-base">¥{Number(p.price).toFixed(2)}</span>
                        <span className="text-gray-500 text-sm">库存 {p.total_stock ?? p.stock}</span>
                        <input
                          type="number"
                          min="0"
                          max={p.total_stock ?? p.stock}
                          value={getQty(p.id, p.skus?.[0]?.id || 'default')}
                          onChange={(e) => handleQtyChange(p.id, p.skus?.[0]?.id || 'default', e.target.value)}
                          placeholder="0"
                          className="w-24 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                        <span className="text-gray-500 text-sm">件</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <label className="block text-base font-semibold text-gray-800 mb-1.5">优惠券码</label>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="输入券码，如 SAVE100"
                  maxLength={64}
                  className={`block w-full rounded-lg border-2 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:ring-2 focus:outline-none ${
                    couponValidation
                      ? couponValidation.valid
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                        : 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-gray-300 focus:border-primary focus:ring-primary/20'
                  }`}
                />
                {validatingCoupon && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">校验中...</span>
                )}
              </div>
            </div>
            {couponValidation && (
              <div className={`mt-2 text-sm flex items-start gap-2 ${couponValidation.valid ? 'text-green-700' : 'text-red-600'}`}>
                <span>{couponValidation.valid ? '✓' : '✗'}</span>
                <div className="flex-1">
                  <div>{couponValidation.message}</div>
                  {couponValidation.valid && couponValidation.coupon && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {couponValidation.coupon.name}
                      {couponValidation.coupon.type === 'fixed'
                        ? ` · 满减 ¥${Number(couponValidation.coupon.value).toFixed(2)}`
                        : ` · ${Number(couponValidation.coupon.value)}折`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-5 bg-gray-50/60 -mx-6 sm:-mx-8 px-6 sm:px-8 -mb-6 sm:-mb-8 pb-6 sm:pb-8 rounded-b-xl">
            <h3 className="text-base font-semibold text-gray-800 mb-3">金额明细</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">商品件数</span>
                <span className="font-medium text-gray-800">{computeTotals.itemsCount} 件</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">优惠前金额</span>
                <span className="font-medium text-gray-800">¥{finalDisplay.original}</span>
              </div>
              {Number(finalDisplay.discount) > 0 && (
                <div className="flex justify-between items-center text-green-700">
                  <span>优惠券减免{finalDisplay.couponInfo ? `（${finalDisplay.couponInfo.code}）` : ''}</span>
                  <span className="font-semibold">-¥{finalDisplay.discount}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-2">
                <span className="text-base font-semibold text-gray-800">应付金额</span>
                <span className="text-2xl font-bold text-primary">¥{finalDisplay.payable}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">备注</label>
            <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="选填" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
        </div>

        <div className="mt-8 flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base disabled:opacity-50">
            {submitting ? '提交中...' : '提交订单'}
          </button>
          <button type="button" onClick={() => navigate('/orders')} disabled={submitting} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base disabled:opacity-50">取消</button>
        </div>
      </form>
    </div>
  )
}
