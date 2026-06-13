import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProduct } from '../api'
import { useToast } from '../contexts/ToastContext'

export default function ProductShow() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [product, setProduct] = useState(null)
  const [err, setErr] = useState(null)

  const load = () => getProduct(id).then(setProduct).catch((e) => { setErr(e.message); showToast(e.message) })

  useEffect(() => { load() }, [id])

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load() }} className="text-primary hover:underline">重试</button></div>
  if (!product) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

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
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div><dt className="text-gray-500 text-sm">名称</dt><dd className="font-medium text-gray-800 mt-0.5">{product.name}</dd></div>
          <div><dt className="text-gray-500 text-sm">SKU</dt><dd className="mt-0.5">{product.sku}</dd></div>
          <div><dt className="text-gray-500 text-sm">分类</dt><dd className="mt-0.5">{product.category?.name ?? '-'}</dd></div>
          <div><dt className="text-gray-500 text-sm">单价</dt><dd className="mt-0.5 text-primary font-bold text-lg">¥{Number(product.price).toFixed(2)}</dd></div>
          <div><dt className="text-gray-500 text-sm">库存</dt><dd className={`mt-0.5 font-medium ${product.stock <= 10 ? 'text-orange-600' : ''}`}>{product.stock} 件</dd></div>
          <div><dt className="text-gray-500 text-sm">状态</dt><dd className="mt-0.5"><span className={product.status ? 'text-green-600 font-medium' : 'text-gray-500'}>{product.status ? '上架' : '下架'}</span></dd></div>
        </dl>
        {product.description && (
          <>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100"><h3 className="text-sm font-medium text-gray-600">描述</h3></div>
            <div className="px-6 py-4 text-gray-700 text-sm">{product.description}</div>
          </>
        )}
      </div>
    </div>
  )
}
