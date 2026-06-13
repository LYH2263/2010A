import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCustomers, deleteCustomer } from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../contexts/ToastContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

const PER_PAGE = 10

const levelMap = { normal: '普通', silver: '银卡', gold: '金卡', diamond: '钻石' }
const levelClass = { normal: 'bg-gray-100 text-gray-600', silver: 'bg-gray-200 text-gray-700', gold: 'bg-amber-100 text-amber-700', diamond: 'bg-cyan-100 text-cyan-700' }

export default function CustomerList() {
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [searchKw, setSearchKw] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [searchLevel, setSearchLevel] = useState('')
  const [statusLabels, setStatusLabels] = useState({})
  const [levelLabels, setLevelLabels] = useState({})

  const load = (p = page) => {
    const params = { per_page: PER_PAGE, page: p }
    if (searchKw) params.keyword = searchKw
    if (searchStatus !== '') params.status = searchStatus
    if (searchLevel) params.level = searchLevel
    getCustomers(params)
      .then((data) => {
        setRes(data.customers || data)
        if (data.status_labels) setStatusLabels(data.status_labels)
        if (data.level_labels) setLevelLabels(data.level_labels)
      })
      .catch((e) => { setErr(e.message); showToast(e.message) })
  }

  useEffect(() => { load(page) }, [page, searchKw, searchStatus, searchLevel])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchKw(keyword.trim())
    setSearchStatus(statusFilter)
    setSearchLevel(levelFilter)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setStatusFilter('')
    setLevelFilter('')
    setSearchKw('')
    setSearchStatus('')
    setSearchLevel('')
    setPage(1)
  }

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: '删除客户',
      message: `确定删除客户「${name}」？若该客户下仍有关联订单将删除失败。`,
      confirmText: '确认删除',
      tone: 'danger',
    })
    if (!ok) return
    deleteCustomer(id)
      .then(() => { showToast('客户已删除', 'success'); load(page) })
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
          <h1 className="text-xl font-bold text-gray-800">客户管理</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理客户信息，查看消费与订单</p>
        </div>
        <Link to="/customers/create" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shrink-0">新增客户</Link>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索姓名 / 手机号" className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
        </div>
        <div className="w-full sm:w-36">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
            <option value="">全部状态</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-36">
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
            <option value="">全部等级</option>
            {Object.entries(levelLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm">搜索</button>
          <button type="button" onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm">重置</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">暂无客户</p>
            <p className="text-sm mt-1">添加客户后可在创建订单时选择</p>
            <Link to="/customers/create" className="inline-block mt-4 text-primary hover:underline">去新增客户</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] divide-y divide-gray-200">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">姓名</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">手机号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">等级</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">累计消费</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">累计订单</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((c) => (
                    <tr key={c.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{c.id}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        <Link to={`/customers/${c.id}`} className="text-primary hover:underline">{c.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.phone}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${levelClass[c.level] || 'bg-gray-100'}`}>
                          {c.level_label || levelMap[c.level] || c.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-primary font-medium">¥{Number(c.total_spent).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.total_orders}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(c.status)}`}>
                          {c.status_label || statusLabels[c.status] || c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        <Link to={`/customers/${c.id}`} className="text-primary hover:underline">详情</Link>
                        <Link to={`/customers/${c.id}/edit`} className="text-primary hover:underline">编辑</Link>
                        <button type="button" onClick={() => handleDelete(c.id, c.name)} className="text-red-600 hover:underline">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-gray-500">共 {total} 个客户</span>
              <Pagination currentPage={currentPage} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
