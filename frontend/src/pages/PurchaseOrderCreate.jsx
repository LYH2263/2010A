import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import {
  getPurchaseOrderCreateMeta,
  getPurchaseOrderEditMeta,
  createPurchaseOrder,
  updatePurchaseOrder,
  getProducts,
  resolveImageUrl,
} from '../api'
import { useToast } from '../contexts/ToastContext'

function getSpecText(sku) {
  if (!sku) return ''
  if (sku.spec_text) return sku.spec_text
  if (sku.specValues && Array.isArray(sku.specValues)) {
    return sku.specValues.map(sv => `${sv.spec?.name}: ${sv.value}`).filter(Boolean).join(' / ')
  }
  return ''
}

function round2(v) {
  return Math.round(Number(v) * 100) / 100
}

export default function PurchaseOrderCreate() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [meta, setMeta] = useState(null)
  const [order, setOrder] = useState(null)
  const [supplierId, setSupplierId] = useState('')
  const [remark, setRemark] = useState('')
  const [items, setItems] = useState([])
  const [products, setProducts] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [searchKw, setSearchKw] = useState('')
  const [searchProductList, setSearchProductList] = useState([])
  const [showProductSearch, setShowProductSearch] = useState(null)

  const loadMeta = () => {
    const fn = isEdit ? getPurchaseOrderEditMeta(id) : getPurchaseOrderCreateMeta()
    fn.then((data) => {
      setMeta(data)
      if (isEdit && data.purchase_order) {
        const o = data.purchase_order
        setOrder(o)
        setSupplierId(String(o.supplier_id))
        setRemark(o.remark || '')
        if (Array.isArray(o.items) && o.items.length > 0) {
          setItems(o.items.map(it => ({
            _id: Math.random().toString(36).slice(2),
            product_id: it.product_id,
            product_sku_id: it.product_sku_id || '',
            product_name: it.product?.name || '',
            product_sku: it.sku ? {
              id: it.sku.id,
              sku: it.sku.sku,
              price: it.sku.price,
              stock: it.sku.stock,
              specText: getSpecText(it.sku),
            } : null,
            quantity: String(it.quantity),
            unit_price: String(it.unit_price),
          })))
        }
      }
    }).catch((e) => showToast(e.message))
  }

  useEffect(() => { loadMeta() }, [id])

  const loadProductsForSearch = () => {
    if (!searchKw.trim()) {
      setSearchProductList([])
      return
    }
    getProducts({ keyword: searchKw.trim(), per_page: 20 })
      .then((res) => {
        const list = res.data ?? res
        setSearchProductList(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    const t = setTimeout(loadProductsForSearch, 300)
    return () => clearTimeout(t)
  }, [searchKw])

  const addRow = () => {
    setItems([...items, {
      _id: Math.random().toString(36).slice(2),
      product_id: '',
      product_sku_id: '',
      product_name: '',
      product_sku: null,
      quantity: '1',
      unit_price: '0.00',
    }])
  }

  const removeRow = (rowId) => {
    if (items.length <= 1) return
    setItems(items.filter(it => it._id !== rowId))
  }

  const openProductSearch = (rowId) => {
    setShowProductSearch(rowId)
    setSearchKw('')
    setSearchProductList([])
  }

  const closeProductSearch = () => {
    setShowProductSearch(null)
    setSearchKw('')
    setSearchProductList([])
  }

  const selectProduct = (rowId, product) => {
    const skuOptions = (product.skus || []).map(sku => ({
      id: sku.id,
      sku: sku.sku,
      price: sku.price,
      stock: sku.stock,
      specText: getSpecText(sku),
    }))
    const defaultSku = skuOptions.length === 1 ? skuOptions[0] : null
    setItems(items.map(it => {
      if (it._id !== rowId) return it
      return {
        ...it,
        product_id: product.id,
        product_name: product.name,
        product_sku_id: defaultSku ? String(defaultSku.id) : '',
        product_sku: defaultSku,
        unit_price: defaultSku ? String(defaultSku.price) : it.unit_price,
        _skuOptions: skuOptions,
      }
    }))
    closeProductSearch()
  }

  const selectSku = (rowId, skuId) => {
    setItems(items.map(it => {
      if (it._id !== rowId) return it
      const skuOptions = it._skuOptions || []
      const sku = skuOptions.find(s => String(s.id) === String(skuId))
      return {
        ...it,
        product_sku_id: skuId,
        product_sku: sku || null,
        unit_price: sku ? String(sku.price) : it.unit_price,
      }
    }))
  }

  const updateRow = (rowId, field, value) => {
    setItems(items.map(it => it._id === rowId ? { ...it, [field]: value } : it))
  }

  const rowsWithCalc = useMemo(() => {
    return items.map(it => {
      const qty = parseInt(it.quantity) || 0
      const price = round2(it.unit_price)
      const subtotal = round2(qty * price)
      return { ...it, _qty: qty, _price: price, _subtotal: subtotal }
    })
  }, [items])

  const totalAmount = useMemo(() => {
    return rowsWithCalc.reduce((sum, it) => sum + it._subtotal, 0).toFixed(2)
  }, [rowsWithCalc])

  const totalItemsCount = useMemo(() => {
    return rowsWithCalc.reduce((sum, it) => sum + (it._qty || 0), 0)
  }, [rowsWithCalc])

  const buildPayload = () => {
    const validItems = []
    for (const it of rowsWithCalc) {
      if (!it.product_id) {
        showToast('请为每一行选择商品')
        return null
      }
      if (it._qty <= 0) {
        showToast('采购数量必须大于 0')
        return null
      }
      if (it._price < 0) {
        showToast('采购单价不能为负')
        return null
      }
      const payloadItem = {
        product_id: Number(it.product_id),
        quantity: it._qty,
        unit_price: it._price.toFixed(2),
      }
      if (it.product_sku_id) payloadItem.product_sku_id = Number(it.product_sku_id)
      validItems.push(payloadItem)
    }
    if (validItems.length === 0) {
      showToast('请至少添加一条采购明细')
      return null
    }
    if (!supplierId) {
      showToast('请选择供应商')
      return null
    }
    return {
      supplier_id: Number(supplierId),
      remark: remark,
      items: validItems,
    }
  }

  const handleSave = async (e, action) => {
    e.preventDefault()
    const payload = buildPayload()
    if (!payload) return
    payload.action = action
    setSubmitting(true)
    try {
      if (isEdit) {
        await updatePurchaseOrder(id, payload)
        showToast('采购单已保存', 'success')
      } else {
        const result = await createPurchaseOrder(payload)
        showToast(action === 'submit' ? '采购单已创建并提交' : '采购单草稿已保存', 'success')
        if (result && result.id) {
          navigate('/purchase-orders/' + result.id)
          return
        }
      }
      navigate('/purchase-orders')
    } catch (e) {
      showToast(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!meta) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  if (isEdit && order && order.status != 0) {
    return (
      <div className="space-y-4">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link to="/purchase-orders" className="hover:text-primary">采购单列表</Link>
            <span className="mx-1">/</span>
            <span className="text-gray-800">编辑采购单</span>
          </nav>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-800 font-medium">当前采购单状态为「{order.status_label}」，只有草稿状态可编辑。</p>
          <Link to="/purchase-orders" className="inline-block mt-4 text-primary hover:underline">返回列表</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/purchase-orders" className="hover:text-primary">采购单列表</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">{isEdit ? '编辑采购单' : '新建采购单'}</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">{isEdit ? '编辑采购单' : '新建采购单'}</h1>
        <p className="text-gray-600 text-base mt-1">选择供应商与采购商品，可保存为草稿或直接提交</p>
      </div>

      <form className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 sm:p-8 max-w-6xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">供应商 <span className="text-red-500">*</span></label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="">请选择供应商</option>
              {(meta.suppliers || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.contact_person ? `（${s.contact_person}${s.phone ? ' · ' + s.phone : ''}）` : ''}
                </option>
              ))}
            </select>
            {(meta.suppliers || []).length === 0 && (
              <p className="text-xs text-red-500 mt-1">暂无可用供应商，请先<a href="/suppliers/create" className="text-primary hover:underline">新增供应商</a></p>
            )}
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">备注</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              maxLength={500}
              placeholder="选填"
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-base text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-base font-semibold text-gray-800 m-0">采购明细 <span className="text-red-500">*</span></label>
            <button
              type="button"
              onClick={addRow}
              className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-sm font-medium"
            >+ 添加一行</button>
          </div>

          {items.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-500 mb-3">暂无采购明细</p>
              <button type="button" onClick={addRow} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium">
                + 添加采购明细
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full min-w-[960px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-600 w-12">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-600">商品</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-600">SKU</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-600 w-28">采购数量</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-600 w-32">采购单价</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-600 w-32">小计</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-600 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rowsWithCalc.map((it, idx) => (
                    <tr key={it._id} className="relative">
                      <td className="px-3 py-2.5 text-sm text-gray-500 align-top">{idx + 1}</td>
                      <td className="px-3 py-2.5 align-top">
                        {!it.product_id ? (
                          <button
                            type="button"
                            onClick={() => openProductSearch(it._id)}
                            className="w-full text-left border-2 border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary hover:bg-primary/5"
                          >+ 点击选择商品</button>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">{it.product_name}</div>
                              <button
                                type="button"
                                onClick={() => openProductSearch(it._id)}
                                className="text-xs text-primary hover:underline mt-0.5"
                              >更换商品</button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        {it.product_id && (
                          it._skuOptions && it._skuOptions.length > 0 ? (
                            it._skuOptions.length === 1 ? (
                              <div className="text-sm text-gray-600 py-2">
                                <div className="text-xs text-gray-400">SKU：{it._skuOptions[0].sku}</div>
                                {it._skuOptions[0].specText && <div className="text-xs mt-0.5">{it._skuOptions[0].specText}</div>}
                              </div>
                            ) : (
                              <select
                                value={it.product_sku_id}
                                onChange={(e) => selectSku(it._id, e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                              >
                                <option value="">请选择SKU</option>
                                {it._skuOptions.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.sku}{s.specText ? ` · ${s.specText}` : ''}
                                  </option>
                                ))}
                              </select>
                            )
                          ) : (
                            <div className="text-sm text-gray-400 py-2">无SKU</div>
                          )
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={it.quantity}
                          onChange={(e) => updateRow(it._id, 'quantity', e.target.value)}
                          className="w-full text-right rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.unit_price}
                            onChange={(e) => updateRow(it._id, 'unit_price', e.target.value)}
                            className="w-full text-right rounded-lg border border-gray-300 bg-white pl-6 pr-2 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right align-top">
                        <div className="py-2 text-sm font-medium text-gray-800">¥{it._subtotal.toFixed(2)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center align-top">
                        <button
                          type="button"
                          onClick={() => removeRow(it._id)}
                          disabled={items.length <= 1}
                          className="text-red-500 hover:text-red-700 text-sm disabled:text-gray-300 disabled:hover:text-gray-300"
                          title="删除此行"
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-5 bg-gray-50/60 -mx-6 sm:-mx-8 px-6 sm:px-8 -mb-6 sm:-mb-8 pb-6 sm:pb-8 rounded-b-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1 text-sm text-gray-600">
              <div>共 <span className="font-medium text-gray-800">{rowsWithCalc.length}</span> 条明细，
              <span className="font-medium text-gray-800">{totalItemsCount}</span> 件商品</div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-sm text-gray-600">采购总额</div>
              <div className="text-3xl font-bold text-primary">¥{totalAmount}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t">
          <button
            type="button"
            onClick={(e) => handleSave(e, 'draft')}
            disabled={submitting}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-medium text-base disabled:opacity-50"
          >{isEdit ? '保存修改' : '保存草稿'}</button>
          <button
            type="button"
            onClick={(e) => handleSave(e, 'submit')}
            disabled={submitting}
            className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium text-base disabled:opacity-50"
          >{isEdit ? '保存并提交' : '提交采购单'}</button>
          <button
            type="button"
            onClick={() => navigate('/purchase-orders')}
            disabled={submitting}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-5 py-2.5 rounded-lg font-medium text-base disabled:opacity-50"
          >取消</button>
        </div>
      </form>

      {showProductSearch && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeProductSearch}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">选择商品</h3>
              <button type="button" onClick={closeProductSearch} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <input
                type="text"
                autoFocus
                value={searchKw}
                onChange={(e) => setSearchKw(e.target.value)}
                placeholder="输入商品名称或编码搜索..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {searchProductList.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">
                  {searchKw.trim() ? '未找到匹配的商品' : '请输入关键词搜索商品'}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchProductList.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectProduct(showProductSearch, p)}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">编码：{p.sku}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          SKU 数量：{(p.skus || []).length} · 库存总计：
                          {(p.skus || []).reduce((s, sku) => s + (Number(sku.stock) || 0), 0)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={closeProductSearch} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
