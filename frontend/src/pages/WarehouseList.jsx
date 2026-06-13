import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getWarehouses, deleteWarehouse } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const PER_PAGE = 10

export default function WarehouseList() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchKw, setSearchKw] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [statusLabels, setStatusLabels] = useState({})
  const [stats, setStats] = useState(null)

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (searchKw) params.keyword = searchKw
    if (searchStatus !== '') params.status = searchStatus
    getWarehouses(params)
      .then((data) => {
        setRes(data.warehouses || data)
        if (data.status_labels) setStatusLabels(data.status_labels)
        if (data.stats) setStats(data.stats)
      })
      .catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { load(page) }, [page, searchKw, searchStatus])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchKw(keyword.trim())
    setSearchStatus(statusFilter)
    setPage(1)
  }

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: '删除仓库',
      message: `确定删除「${name}」？若该仓库下仍有关联库存将删除失败。`,
      confirmText: '确认删除',
      tone: 'danger',
    })
    if (!ok) return
    deleteWarehouse(id)
      .then(() => { showToast('仓库已删除', 'success'); load(page) })
      .catch((e) => showToast(e.message))
  }

  if (err) return <div className="p-4 text-center text-gray-600">加载失败，请 <button type="button" onClick={() => { setErr(null); load(page) }} className="text-primary hover:underline">重试</button></div>
  if (!res) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>

  const list = res.data ?? res
  const total = res.total ?? list.length
  const currentPage = res.current_page ?? 1
  const lastPage = res.last_page ?? 1

  const statusClass = (s) => {
    if (s == 1) return 'bg-green-100 text-green-700'
    return 'bg-gray-200 text-gray-600'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">仓库管理</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理仓库信息，用于库存和采购单关联仓库</p>
        </div>
        <Link to="/warehouses/create" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shrink-0">新增仓库</Link>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
            <p className="text-sm text-gray-500">总仓库数</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
            <p className="text-sm text-gray-500">启用仓库</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.active ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
            <p className="text-sm text-gray-500">禁用仓库</p>
            <p className="text-2xl font-bold text-gray-500 mt-1">{stats.inactive ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
            <p className="text-sm text-gray-500">默认仓库</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.default ? '有' : '无'}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索名称 / 编码 / 地址" className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
        </div>
        <div className="w-full sm:w-40">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
            <option value="">全部状态</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">搜索</button>
          <button type="button" onClick={() => { setKeyword(''); setStatusFilter(''); setSearchKw(''); setSearchStatus(''); setPage(1) }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无仓库</p>
            <p className="text-sm mt-1">添加仓库后可在库存管理和采购单中选择</p>
            <Link to="/warehouses/create" className="inline-block mt-4 text-primary hover:underline">去新增仓库</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">仓库名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">仓库编码</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">地址</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">默认仓库</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((w) => (
                    <tr key={w.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{w.id}</td>
                      <td className="px-4 py-3 text-sm font-medium">{w.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{w.code || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{w.address || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(w.status)}`}>
                          {w.status_label || statusLabels[w.status] || w.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {w.is_default ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">默认</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link to={'/warehouses/' + w.id + '/edit'} className="text-primary hover:underline">编辑</Link>
                        <button type="button" onClick={() => handleDelete(w.id, w.name)} className="text-red-600 hover:underline ml-2">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 个仓库</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
