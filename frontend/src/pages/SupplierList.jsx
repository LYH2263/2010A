import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSuppliers, deleteSupplier } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const PER_PAGE = 10

export default function SupplierList() {
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

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (searchKw) params.keyword = searchKw
    if (searchStatus !== '') params.status = searchStatus
    getSuppliers(params)
      .then((data) => {
        setRes(data.suppliers || data)
        if (data.status_labels) setStatusLabels(data.status_labels)
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
      title: '删除供应商',
      message: `确定删除「${name}」？若该供应商下仍有关联采购单将删除失败。`,
      confirmText: '确认删除',
      tone: 'danger',
    })
    if (!ok) return
    deleteSupplier(id)
      .then(() => { showToast('供应商已删除', 'success'); load(page) })
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
          <h1 className="text-xl font-bold text-gray-800">供应商管理</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理供应商信息，用于采购单关联供应商</p>
        </div>
        <Link to="/suppliers/create" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shrink-0">新增供应商</Link>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索名称 / 联系人 / 电话" className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
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
            <p className="text-lg">暂无供应商</p>
            <p className="text-sm mt-1">添加供应商后可在创建采购单时选择</p>
            <Link to="/suppliers/create" className="inline-block mt-4 text-primary hover:underline">去新增供应商</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">供应商名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">联系人</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">联系电话</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">地址</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((s) => (
                    <tr key={s.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{s.id}</td>
                      <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.contact_person || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{s.address || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(s.status)}`}>
                          {s.status_label || statusLabels[s.status] || s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link to={'/suppliers/' + s.id + '/edit'} className="text-primary hover:underline">编辑</Link>
                        <button type="button" onClick={() => handleDelete(s.id, s.name)} className="text-red-600 hover:underline ml-2">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 个供应商</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
