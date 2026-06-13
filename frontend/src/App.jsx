import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmDialogProvider } from './contexts/ConfirmDialogContext'
import ProtectedRoute from './components/ProtectedRoute'
import { useState, useEffect, useRef } from 'react'
import { getNotificationSummary, markNotificationRead, markAllNotificationsRead } from './api'
import { useToast } from './contexts/ToastContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProductList from './pages/ProductList'
import ProductCreate from './pages/ProductCreate'
import ProductEdit from './pages/ProductEdit'
import ProductShow from './pages/ProductShow'
import CategoryList from './pages/CategoryList'
import CategoryCreate from './pages/CategoryCreate'
import CategoryEdit from './pages/CategoryEdit'
import OrderList from './pages/OrderList'
import OrderCreate from './pages/OrderCreate'
import OrderShow from './pages/OrderShow'
import CouponList from './pages/CouponList'
import CouponCreate from './pages/CouponCreate'
import CouponEdit from './pages/CouponEdit'
import RefundList from './pages/RefundList'
import RefundShow from './pages/RefundShow'
import InventoryList from './pages/InventoryList'
import InventoryAdjust from './pages/InventoryAdjust'
import StockMovementList from './pages/StockMovementList'
import SalesReport from './pages/SalesReport'
import SupplierList from './pages/SupplierList'
import SupplierCreate from './pages/SupplierCreate'
import SupplierEdit from './pages/SupplierEdit'
import PurchaseOrderList from './pages/PurchaseOrderList'
import PurchaseOrderCreate from './pages/PurchaseOrderCreate'
import PurchaseOrderShow from './pages/PurchaseOrderShow'
import CustomerList from './pages/CustomerList'
import CustomerCreate from './pages/CustomerCreate'
import CustomerEdit from './pages/CustomerEdit'
import CustomerShow from './pages/CustomerShow'
import NotificationCenter from './pages/NotificationCenter'
import WarehouseList from './pages/WarehouseList'
import WarehouseCreate from './pages/WarehouseCreate'
import WarehouseEdit from './pages/WarehouseEdit'

function BellIcon({ className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function formatNotificationTime(createdAt) {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}

function NotificationDropdown({ isOpen, onClose, summary, onRefresh, onMarkRead, onMarkAllRead }) {
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen || !summary) return null

  const notifications = summary.recent || []
  const unreadCount = summary.unread_count || 0

  const handleMarkRead = async (e, id) => {
    e.stopPropagation()
    try {
      const result = await markNotificationRead(id)
      onMarkRead(result)
    } catch (err) {
      showToast(err.message || '操作失败')
    }
  }

  const handleMarkAll = async () => {
    try {
      const result = await markAllNotificationsRead()
      onMarkAllRead(result)
      showToast(`已标记 ${result.marked_count} 条通知为已读`, 'success')
    } catch (err) {
      showToast(err.message || '操作失败')
    }
  }

  const handleGoToCenter = () => {
    onClose()
    navigate('/notifications')
  }

  const handleGoToProduct = (notification) => {
    onClose()
    if (notification.product_id) {
      if (notification.product_sku_id) {
        navigate(`/inventory/${notification.product_id}/adjust`)
      } else {
        navigate(`/inventory/${notification.product_id}/adjust`)
      }
    }
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
    >
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">通知中心</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-sm text-primary hover:underline"
            >
              全部已读
            </button>
          )}
          <button
            onClick={handleGoToCenter}
            className="text-sm text-gray-500 hover:text-primary"
          >
            查看全部
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">
            <BellIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>暂无通知</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`px-4 py-3 cursor-pointer transition-colors ${n.is_read ? 'bg-white hover:bg-gray-50' : 'bg-orange-50/60 hover:bg-orange-50'}`}
                onClick={() => handleGoToProduct(n)}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${n.is_read ? 'bg-gray-300' : 'bg-orange-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.is_read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">
                        {formatNotificationTime(n.created_at)}
                      </span>
                      {!n.is_read && (
                        <button
                          onClick={(e) => handleMarkRead(e, n.id)}
                          className="text-xs text-primary hover:underline ml-2"
                        >
                          标为已读
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onRefresh}
          className="w-full text-sm text-gray-600 hover:text-primary py-1"
        >
          刷新通知
        </button>
      </div>
    </div>
  )
}

function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationSummary, setNotificationSummary] = useState(null)
  const [pollingError, setPollingError] = useState(null)

  const loadSummary = () => {
    getNotificationSummary()
      .then((data) => {
        setNotificationSummary(data)
        setPollingError(null)
      })
      .catch((err) => {
        if (err.message !== 'UNAUTHORIZED') {
          setPollingError(err.message)
        }
      })
  }

  useEffect(() => {
    if (user) {
      loadSummary()
      const interval = setInterval(loadSummary, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const toggleDropdown = () => {
    if (!dropdownOpen) {
      loadSummary()
    }
    setDropdownOpen(!dropdownOpen)
  }

  const handleMarkRead = (result) => {
    loadSummary()
  }

  const handleMarkAllRead = (result) => {
    loadSummary()
  }

  const unreadCount = notificationSummary?.unread_count || 0

  return (
    <div className="min-h-screen layout-bg flex flex-col">
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200 relative z-10">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 min-h-[5rem]">
            <div className="flex items-center">
              <NavLink to="/" className="text-primary font-bold text-3xl">商品管理系统</NavLink>
              <div className="ml-12 flex items-center gap-8 flex-wrap">
                <NavLink to="/" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>仪表盘</NavLink>
                <NavLink to="/products" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>商品</NavLink>
                <NavLink to="/categories" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>分类</NavLink>
                <NavLink to="/suppliers" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>供应商</NavLink>
                <NavLink to="/purchase-orders" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>采购单</NavLink>
                <NavLink to="/orders" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>订单</NavLink>
                <NavLink to="/customers" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>客户</NavLink>
                <NavLink to="/coupons" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>优惠券</NavLink>
                <NavLink to="/refunds" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>退款</NavLink>
                <NavLink to="/inventory" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>库存</NavLink>
                <NavLink to="/inventory/movements" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>库存流水</NavLink>
                <NavLink to="/warehouses" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>仓库管理</NavLink>
                <NavLink to="/sales-report" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>销售分析</NavLink>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-5">
                <div className="relative">
                  <button
                    onClick={toggleDropdown}
                    className="relative p-2 text-gray-600 hover:text-primary transition-colors rounded-lg hover:bg-orange-50"
                    title="通知"
                  >
                    <BellIcon className="w-6 h-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <NotificationDropdown
                    isOpen={dropdownOpen}
                    onClose={() => setDropdownOpen(false)}
                    summary={notificationSummary}
                    onRefresh={loadSummary}
                    onMarkRead={handleMarkRead}
                    onMarkAllRead={handleMarkAllRead}
                  />
                </div>
                <span className="text-lg text-gray-600">欢迎，{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-lg text-gray-600 hover:text-primary font-medium"
                >
                  登出
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 relative z-10">
        {children}
      </main>
      <footer className="border-t border-gray-200 bg-white/95 backdrop-blur-sm mt-auto relative z-10">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-gray-500 text-sm">
          商品管理系统 · 小型电商后台
        </div>
      </footer>
    </div>
  )
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <Layout>
              <ProtectedRoute>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/notifications" element={<NotificationCenter />} />
                  <Route path="/products" element={<ProductList />} />
                  <Route path="/products/create" element={<ProductCreate />} />
                  <Route path="/products/:id/edit" element={<ProductEdit />} />
                  <Route path="/products/:id" element={<ProductShow />} />
                  <Route path="/categories" element={<CategoryList />} />
                  <Route path="/categories/create" element={<CategoryCreate />} />
                  <Route path="/categories/:id/edit" element={<CategoryEdit />} />
                  <Route path="/suppliers" element={<SupplierList />} />
                  <Route path="/suppliers/create" element={<SupplierCreate />} />
                  <Route path="/suppliers/:id/edit" element={<SupplierEdit />} />
                  <Route path="/purchase-orders" element={<PurchaseOrderList />} />
                  <Route path="/purchase-orders/create" element={<PurchaseOrderCreate />} />
                  <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderCreate />} />
                  <Route path="/purchase-orders/:id" element={<PurchaseOrderShow />} />
                  <Route path="/orders" element={<OrderList />} />
                  <Route path="/orders/create" element={<OrderCreate />} />
                  <Route path="/orders/:id" element={<OrderShow />} />
                  <Route path="/customers" element={<CustomerList />} />
                  <Route path="/customers/create" element={<CustomerCreate />} />
                  <Route path="/customers/:id/edit" element={<CustomerEdit />} />
                  <Route path="/customers/:id" element={<CustomerShow />} />
                  <Route path="/coupons" element={<CouponList />} />
                  <Route path="/coupons/create" element={<CouponCreate />} />
                  <Route path="/coupons/:id/edit" element={<CouponEdit />} />
                  <Route path="/refunds" element={<RefundList />} />
                  <Route path="/refunds/:id" element={<RefundShow />} />
                  <Route path="/inventory" element={<InventoryList />} />
                  <Route path="/inventory/movements" element={<StockMovementList />} />
                  <Route path="/inventory/movements/:productId" element={<StockMovementList />} />
                  <Route path="/inventory/:productId/adjust" element={<InventoryAdjust />} />
                  <Route path="/sales-report" element={<SalesReport />} />
                  <Route path="/warehouses" element={<WarehouseList />} />
                  <Route path="/warehouses/create" element={<WarehouseCreate />} />
                  <Route path="/warehouses/:id/edit" element={<WarehouseEdit />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ProtectedRoute>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmDialogProvider>
          <AppRoutes />
        </ConfirmDialogProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
