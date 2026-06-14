import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createProduct } from '../api'
import { getCategoriesAll } from '../api'
import { useToast } from '../contexts/ToastContext'
import ProductImageUploader from '../components/ProductImageUploader'

function generateSkuMatrix(specs) {
  if (specs.length === 0 || specs.every(s => !s.values || s.values.length === 0)) {
    return []
  }
  const validSpecs = specs.filter(s => s.values && s.values.length > 0)
  if (validSpecs.length === 0) return []

  const values = validSpecs.map(s => s.values.map(v => ({ specName: s.name, value: v })))
  const cartesian = (arrays) => {
    return arrays.reduce((acc, curr) => {
      return acc.flatMap(a => curr.map(b => [...a, b]))
    }, [[]])
  }
  const combinations = cartesian(values)
  return combinations.map((combo, idx) => {
    const specValues = {}
    combo.forEach(sv => { specValues[sv.specName] = sv.value })
    return {
      id: `sku-${idx}`,
      sku: '',
      price: '',
      stock: 0,
      alert_threshold: '',
      spec_values: specValues,
    }
  })
}

function getSpecText(specValues) {
  if (!specValues) return ''
  return Object.entries(specValues).map(([k, v]) => `${k}: ${v}`).join(' / ')
}

export default function ProductCreate() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ name: '', sku: '', category_id: '', price: '', stock: 0, status: 1, description: '', alert_threshold: '' })
  const [hasSpecs, setHasSpecs] = useState(false)
  const [specs, setSpecs] = useState([])
  const [skus, setSkus] = useState([])
  const [images, setImages] = useState([])

  useEffect(() => {
    getCategoriesAll().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (hasSpecs) {
      const matrix = generateSkuMatrix(specs)
      setSkus(matrix)
    } else {
      setSkus([])
    }
  }, [hasSpecs, JSON.stringify(specs)])

  const addSpec = () => {
    setSpecs([...specs, { name: '', values: [''] }])
  }

  const removeSpec = (idx) => {
    setSpecs(specs.filter((_, i) => i !== idx))
  }

  const updateSpecName = (idx, name) => {
    const newSpecs = [...specs]
    newSpecs[idx].name = name
    setSpecs(newSpecs)
  }

  const addSpecValue = (specIdx) => {
    const newSpecs = [...specs]
    newSpecs[specIdx].values.push('')
    setSpecs(newSpecs)
  }

  const removeSpecValue = (specIdx, valIdx) => {
    const newSpecs = [...specs]
    newSpecs[specIdx].values.splice(valIdx, 1)
    setSpecs(newSpecs)
  }

  const updateSpecValue = (specIdx, valIdx, value) => {
    const newSpecs = [...specs]
    newSpecs[specIdx].values[valIdx] = value
    setSpecs(newSpecs)
  }

  const updateSkuField = (idx, field, value) => {
    const newSkus = [...skus]
    newSkus[idx][field] = value
    setSkus(newSkus)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (hasSpecs) {
      const validSpecs = specs.filter(s => s.name.trim() && s.values.some(v => v.trim()))
      if (validSpecs.length === 0) {
        showToast('至少需要一个有效规格')
        return
      }

      const validSkus = skus.filter(s => s.sku.trim() && s.price !== '' && Number(s.price) >= 0)
      if (validSkus.length === 0) {
        showToast('请填写至少一个 SKU 的编码和价格')
        return
      }

      const emptyStockSkus = validSkus.filter(s => s.stock === '' || s.stock === null || s.stock === undefined)
      if (emptyStockSkus.length > 0) {
        showToast('请填写所有 SKU 的库存')
        return
      }

      const skuCodes = validSkus.map(s => s.sku.trim())
      const dupCodes = skuCodes.filter((c, i) => skuCodes.indexOf(c) !== i)
      if (dupCodes.length > 0) {
        showToast(`SKU 编码「${[...new Set(dupCodes)].join('、')}」重复，请修改后重试`)
        return
      }

      const payload = {
        name: form.name,
        sku: form.sku,
        category_id: form.category_id || null,
        price: skus.length > 0 ? skus[0].price : form.price,
        stock: skus.reduce((sum, s) => sum + Number(s.stock || 0), 0),
        status: Number(form.status),
        description: form.description || null,
        alert_threshold: form.alert_threshold !== '' ? Number(form.alert_threshold) : null,
        specs: specs.filter(s => s.name.trim() && s.values.some(v => v.trim())).map(s => ({
          name: s.name.trim(),
          values: s.values.filter(v => v.trim()).map(v => v.trim()),
        })),
        skus: skus.filter(s => s.sku.trim()).map(s => ({
          sku: s.sku.trim(),
          price: s.price,
          stock: Number(s.stock) || 0,
          alert_threshold: s.alert_threshold !== '' ? Number(s.alert_threshold) : null,
          spec_values: s.spec_values,
        })),
        images: images.map(img => ({ id: img.id, is_main: !!img.is_main })),
      }
      createProduct(payload)
        .then(() => { showToast('商品已创建', 'success'); navigate('/products') })
        .catch((e) => showToast(e.message))
    } else {
      const payload = {
        name: form.name,
        sku: form.sku,
        category_id: form.category_id || null,
        price: form.price,
        stock: form.stock ?? 0,
        status: Number(form.status),
        description: form.description || null,
        alert_threshold: form.alert_threshold !== '' ? Number(form.alert_threshold) : null,
        images: images.map(img => ({ id: img.id, is_main: !!img.is_main })),
      }
      createProduct(payload)
        .then(() => { showToast('商品已创建', 'success'); navigate('/products') })
        .catch((e) => showToast(e.message))
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/products" className="hover:text-primary">商品列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">新增商品</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">新增商品</h1>
        <p className="text-gray-600 text-base mt-1">填写商品基本信息，可选择启用多规格</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8">
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">分类</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value="">-- 请选择 --</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">商品名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="请输入商品名称" className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">商品编码 <span className="text-red-500">*</span></label>
            <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="请输入商品编码" className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">描述</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="选填，商品描述" rows={3} className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
          </div>

          <div>
            <ProductImageUploader value={images} onChange={setImages} />
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">状态</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
              <option value={1}>上架</option>
              <option value={0}>下架</option>
            </select>
          </div>

          <div className="border-t border-gray-200 pt-5">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-base font-semibold text-gray-800">多规格 SKU</label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasSpecs} onChange={(e) => setHasSpecs(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm text-gray-600">启用多规格</span>
              </label>
            </div>

            {!hasSpecs && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-base font-semibold text-gray-800 mb-1.5">单价 <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required placeholder="0.00" className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-800 mb-1.5">库存</label>
                  <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-800 mb-1.5">
                    预警阈值
                    <span className="text-xs text-gray-500 font-normal ml-1">（空=全局默认）</span>
                  </label>
                  <input type="number" min="0" value={form.alert_threshold} onChange={(e) => setForm({ ...form, alert_threshold: e.target.value })} placeholder="留空使用全局默认值 10" className="mt-0 block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
                </div>
              </div>
            )}

            {hasSpecs && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">规格项</span>
                    <button type="button" onClick={addSpec} className="text-primary text-sm hover:underline">+ 添加规格</button>
                  </div>

                  {specs.map((spec, specIdx) => (
                    <div key={specIdx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          value={spec.name}
                          onChange={(e) => updateSpecName(specIdx, e.target.value)}
                          placeholder="规格名称，如颜色、尺寸"
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                        <button type="button" onClick={() => removeSpec(specIdx)} className="text-red-500 text-sm hover:underline">删除</button>
                      </div>
                      <div className="space-y-2">
                        {spec.values.map((val, valIdx) => (
                          <div key={valIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => updateSpecValue(specIdx, valIdx, e.target.value)}
                              placeholder="规格值"
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            />
                            <button type="button" onClick={() => removeSpecValue(specIdx, valIdx)} className="text-gray-400 text-sm hover:text-red-500">×</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addSpecValue(specIdx)} className="text-primary text-sm hover:underline">+ 添加规格值</button>
                      </div>
                    </div>
                  ))}
                </div>

                {skus.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">SKU 列表（共 {skus.length} 个）</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-primary-light">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-700 font-medium">规格组合</th>
                            <th className="px-3 py-2 text-left text-gray-700 font-medium">SKU 编码</th>
                            <th className="px-3 py-2 text-left text-gray-700 font-medium">价格</th>
                            <th className="px-3 py-2 text-left text-gray-700 font-medium">库存</th>
                            <th className="px-3 py-2 text-left text-gray-700 font-medium">预警阈值</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {skus.map((sku, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-gray-600">{getSpecText(sku.spec_values)}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={sku.sku}
                                  onChange={(e) => updateSkuField(idx, 'sku', e.target.value)}
                                  placeholder="SKU 编码"
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={sku.price}
                                  onChange={(e) => updateSkuField(idx, 'price', e.target.value)}
                                  placeholder="0.00"
                                  className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={sku.stock}
                                  onChange={(e) => updateSkuField(idx, 'stock', e.target.value)}
                                  placeholder="0"
                                  className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={sku.alert_threshold}
                                  onChange={(e) => updateSkuField(idx, 'alert_threshold', e.target.value)}
                                  placeholder="空=继承商品"
                                  className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex gap-3 pt-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base">保存</button>
          <button type="button" onClick={() => navigate('/products')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base">取消</button>
        </div>
      </form>
    </div>
  )
}
