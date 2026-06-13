import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProduct, resolveImageUrl } from '../api'
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

export default function ProductShow() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [product, setProduct] = useState(null)
  const [err, setErr] = useState(null)

  const load = () => getProduct(id).then(setProduct).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [id])

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!product) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const hasMultiSku = product.skus && product.skus.length > 1
  const minPrice = hasMultiSku ? Math.min(...product.skus.map(s => Number(s.price))) : Number(product.price)
  const maxPrice = hasMultiSku ? Math.max(...product.skus.map(s => Number(s.price))) : Number(product.price)
  const totalStock = hasMultiSku ? product.skus.reduce((sum, s) => sum + Number(s.stock), 0) : Number(product.stock)
  const priceText = minPrice === maxPrice ? `¥${minPrice.toFixed(2)}` : `¥${minPrice.toFixed(2)} ~ ¥${maxPrice.toFixed(2)}`

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">商品详情</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看商品基本信息，可在此编辑或去库存页调整库存</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={'/products/' + id + '/edit'} state={{ from: 'detail' }} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium">编辑</Link>
          <Link to={'/inventory/' + id + '/adjust'} state={{ from: 'detail' }} className="bg-white border border-primary text-primary hover:bg-primary-light px-4 py-2 rounded-lg font-medium">调整库存</Link>
          <Link to={'/inventory/movements/' + id} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium">查看商品流水</Link>
          <Link to="/products" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">返回列表</Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-primary-light border-b border-orange-100">
          <h2 className="font-semibold text-gray-800">基本信息</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="shrink-0">
              {product.main_image_url || product.main_image_thumbnail ? (
                <img
                  src={resolveImageUrl(product.main_image_url || product.main_image_thumbnail)}
                  alt={product.name}
                  className="w-48 h-48 object-cover rounded-lg border border-gray-200 bg-white shadow-sm"
                />
              ) : (
                <div className="w-48 h-48 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path strokeLinecap="round" d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="text-xs">暂无主图</span>
                </div>
              )}
            </div>
            <dl className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div><dt className="text-gray-500 text-sm">名称</dt><dd className="font-medium text-gray-800 mt-0.5">{product.name}</dd></div>
              <div><dt className="text-gray-500 text-sm">商品编码</dt><dd className="mt-0.5">{product.sku}</dd></div>
              <div><dt className="text-gray-500 text-sm">分类</dt><dd className="mt-0.5">{product.category?.name ?? '-'}</dd></div>
              <div><dt className="text-gray-500 text-sm">价格</dt><dd className="mt-0.5 text-primary font-bold text-lg">{priceText}</dd></div>
              <div><dt className="text-gray-500 text-sm">总库存</dt><dd className={`mt-0.5 font-medium ${totalStock <= 10 ? 'text-orange-600' : ''}`}>{totalStock} 件</dd></div>
              <div><dt className="text-gray-500 text-sm">状态</dt><dd className="mt-0.5"><span className={product.status ? 'text-green-600 font-medium' : 'text-gray-500'}>{product.status ? '上架' : '下架'}</span></dd></div>
            </dl>
          </div>
        </div>
        {Array.isArray(product.images) && product.images.length > 1 && (
          <>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100"><h3 className="text-sm font-medium text-gray-600">商品图片（共 {product.images.length} 张）</h3></div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {product.images.map((img, idx) => (
                  <div
                    key={img.id || idx}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden bg-gray-50 ${img.is_main ? 'border-primary ring-2 ring-primary/30' : 'border-gray-200'}`}
                    title={img.is_main ? '主图' : ''}
                  >
                    <img
                      src={resolveImageUrl(img.absolute_url || img.url)}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {img.is_main && (
                      <div className="absolute top-0.5 left-0.5 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded shadow">
                        主
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {product.description && (
          <>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100"><h3 className="text-sm font-medium text-gray-600">描述</h3></div>
            <div className="px-6 py-4 text-gray-700 text-sm">{product.description}</div>
          </>
        )}
      </div>

      {hasMultiSku && (
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-primary-light border-b border-orange-100">
            <h2 className="font-semibold text-gray-800">SKU 列表（共 {product.skus.length} 个）</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SKU 编码</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">规格</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">价格</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">库存</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {product.skus.map((sku) => (
                  <tr key={sku.id} className="hover:bg-orange-50">
                    <td className="px-4 py-3 text-sm">{sku.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getSpecText(sku) || '-'}</td>
                    <td className="px-4 py-3 text-sm text-primary font-medium">¥{Number(sku.price).toFixed(2)}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${Number(sku.stock) <= 10 ? 'text-orange-600' : ''}`}>{sku.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
