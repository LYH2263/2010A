import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { getProduct, adjustInventory } from '../api'
import { useToast } from '../contexts/ToastContext'

function getSkuSpecText(sku) {
  if (!sku) return ''
  if (sku.spec_text) return sku.spec_text
  if (sku.specValues && Array.isArray(sku.specValues)) {
    return sku.specValues.map(sv => `${sv.spec?.name}: ${sv.value}`).filter(Boolean).join(' / ')
  }
  return ''
}

export default function InventoryAdjust() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const fromDetail = location.state?.from === 'detail'
  const initialSkuId = location.state?.sku_id || ''
  const backTo = () => (fromDetail ? navigate('/products/' + productId) : navigate('/inventory'))
  const [product, setProduct] = useState(null)
  const [selectedSkuId, setSelectedSkuId] = useState(initialSkuId)
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState(null)

  const load = () => getProduct(productId).then(setProduct).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [productId])

  useEffect(() => {
    if (product && initialSkuId && !selectedSkuId) {
      setSelectedSkuId(initialSkuId)
    }
  }, [product, initialSkuId])

  const handleSubmit = (e) => {
    e.preventDefault()
    const d = parseInt(delta, 10)
    if (isNaN(d) || d === 0) {
      showToast('请输入有效的调整数量（正数入库，负数出库）')
      return
    }
    const skuId = selectedSkuId || null
    adjustInventory(productId, d, reason, skuId)
      .then(() => { showToast('库存已调整', 'success'); backTo() })
      .catch((e) => showToast(e.message))
  }

  if (err && !product) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!product) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const hasMultiSku = product.skus && product.skus.length > 1
  const selectedSku = selectedSkuId ? product.skus?.find(s => String(s.id) === String(selectedSkuId)) : null
  const currentStock = selectedSku ? selectedSku.stock : (product.total_stock ?? product.stock)
  const currentPrice = selectedSku ? selectedSku.price : product.price

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/inventory" className="hover:text-primary">库存管理</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">调整库存</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">调整库存</h1>
        <p className="text-gray-600 text-base mt-1">正数表示入库，负数表示出库，提交后立即生效</p>
      </div>

      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 max-w-xl">
        <h2 className="text-base font-semibold text-gray-800 mb-3">当前商品</h2>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-medium text-gray-800 text-base">{product.name}</span>
            <span className="text-gray-600 text-sm">商品编码：{product.sku}</span>
          </div>
          {hasMultiSku && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择 SKU</label>
              <select
                value={selectedSkuId}
                onChange={(e) => setSelectedSkuId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                <option value="">全部（商品级调整）</option>
                {product.skus.map((sku) => (
                  <option key={sku.id} value={sku.id}>
                    {sku.sku} - {getSkuSpecText(sku) || '默认 SKU'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                选择具体 SKU 仅调整该 SKU 库存；不选择则调整商品级库存（仅兼容旧数据）
              </p>
            </div>
          )}
          {selectedSku && (
            <div className="text-sm text-gray-600">
              <span className="inline-block bg-gray-100 px-2 py-0.5 rounded mr-2 font-mono">{selectedSku.sku}</span>
              {getSkuSpecText(selectedSku)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100">
            <span className="text-primary font-bold text-base">当前库存：{currentStock} 件</span>
            <span className="text-gray-500 text-sm">单价：¥{Number(currentPrice).toFixed(2)}</span>
            {currentStock <= 10 && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">低库存</span>}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-xl">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">调整数量 <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              required
              placeholder="例如：+10 或 -5"
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
            <p className="text-gray-500 text-sm mt-1.5">正数入库，负数出库。例如：+10 表示入库 10 件，-5 表示出库 5 件</p>
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">原因（选填）</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="如：采购入库、盘点调整"
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-8 flex gap-3 pt-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base">提交</button>
          <button type="button" onClick={backTo} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base">返回</button>
        </div>
      </form>
    </div>
  )
}
