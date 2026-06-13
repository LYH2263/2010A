import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api'
import { useToast } from '../contexts/ToastContext'
import Pagination from '../components/Pagination'

const TYPE_LABELS = {
  low_stock: '低库存预警',
}

const TYPE_COLORS = {
  low_stock: 'bg-orange-100 text-orange-700',
}

function formatDateTime(str) {
  if (!str) return ''
  const d = new Date(str)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [readFilter, setReadFilter] = useState('')
  const [keyword, setKeyword] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)

  const load = () => {
    setLoading(true)
    const params = { page, per_page: perPage }
    if (readFilter !== '') params.is_read = readFilter
    if (keyword.trim()) params.keyword = keyword.trim()

    getNotifications(params)
      .then((res) => {
        setData(res)
        setUnreadCount(res.unread_count || 0)
        setLoading(false)
      })
      .catch((err) => {
        setLoading(false)
        if (err.message !== 'UNAUTHORIZED') {
          showToast(err.message || '加载失败')
        }
      })
  }

  useEffect(() => {
    load()
  }, [page, perPage, readFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id)
      showToast('已标记为已读', 'success')
      load()
    } catch (err) {
      showToast(err.message || '操作失败')
    }
  }

  const handleMarkAll = async () => {
    if (unreadCount === 0) {
      showToast('没有未读通知')
      return
    }
    try {
      const result = await markAllNotificationsRead()
      showToast(`已标记 ${result.marked_count} 条通知为已读`, 'success')
      load()
    } catch (err) {
      showToast(err.message || '操作失败')
    }
  }

  const handleRowClick = (notification) => {
    if (!notification.is_read) {
      markNotificationRead(notification.id).catch(() => {})
    }
    if (notification.product_id) {
      navigate(`/inventory/${notification.product_id}/adjust`)
    }
  }

  const notifications = data?.notifications?.data || []
  const paginator = data?.notifications || {}
  const defaultThreshold = data?.default_threshold || 10

  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link to="/" className="hover:text-primary">仪表盘</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">通知中心</span>
        </nav>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">通知中心</h1>
            <p className="text-gray-600 text-base mt-1">
              管理系统通知，当前有 <span className="font-semibold text-orange-600">{unreadCount}</span> 条未读
              ，全局预警阈值为 {defaultThreshold}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAll}
              className="bg-white border-2 border-gray-300 hover:border-primary hover:text-primary text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              全部标记已读
            </button>
            <button
              onClick={load}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium text-sm"
            >
              刷新
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-4 sm:p-6">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索消息内容或商品名称"
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">已读状态</label>
            <select
              value={readFilter}
              onChange={(e) => { setReadFilter(e.target.value); setPage(1) }}
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="">全部</option>
              <option value="false">未读</option>
              <option value="true">已读</option>
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">每页</label>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
              className="block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value={10}>10 条</option>
              <option value={15}>15 条</option>
              <option value={30}>30 条</option>
              <option value={50}>50 条</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg font-medium text-sm"
            >
              搜索
            </button>
            <button
              type="button"
              onClick={() => { setKeyword(''); setReadFilter(''); setPage(1) }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg font-medium text-sm"
            >
              重置
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 mx-auto text-gray-300 mb-4">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <p className="text-gray-500 text-lg">暂无通知</p>
            <p className="text-gray-400 text-sm mt-1">当库存低于预警阈值时会在此显示通知</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">类型</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">消息</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">关联商品</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">时间</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {notifications.map((n) => (
                    <tr
                      key={n.id}
                      onClick={() => handleRowClick(n)}
                      className={`cursor-pointer transition-colors ${n.is_read ? 'hover:bg-gray-50' : 'bg-orange-50/40 hover:bg-orange-50'}`}
                    >
                      <td className="px-4 py-3">
                        <div className={`w-3 h-3 rounded-full ${n.is_read ? 'bg-gray-300' : 'bg-orange-500'}`} title={n.is_read ? '已读' : '未读'} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-700'}`}>
                          {TYPE_LABELS[n.type] || n.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-sm ${n.is_read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                          {n.message}
                        </p>
                        {n.extra_data && (
                          <div className="mt-1 text-xs text-gray-400">
                            当前库存: {n.extra_data.current_stock} / 阈值: {n.extra_data.threshold}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {n.product ? (
                          <Link
                            to={`/products/${n.product_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-primary hover:underline block truncate max-w-[180px]"
                          >
                            {n.product.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">{formatDateTime(n.created_at)}</span>
                        {n.read_at && (
                          <div className="text-xs text-gray-400 mt-0.5">已读: {formatDateTime(n.read_at)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!n.is_read && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id) }}
                              className="text-xs text-primary hover:underline"
                            >
                              标为已读
                            </button>
                          )}
                          {n.product_id && (
                            <Link
                              to={`/inventory/${n.product_id}/adjust`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-primary hover:underline"
                            >
                              调整库存
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t-2 border-gray-200 bg-gray-50">
              <Pagination
                currentPage={paginator.current_page || 1}
                lastPage={paginator.last_page || 1}
                total={paginator.total || 0}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
