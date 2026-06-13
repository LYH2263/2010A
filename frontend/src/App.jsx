import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmDialogProvider } from './contexts/ConfirmDialogContext'
import ProtectedRoute from './components/ProtectedRoute'
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
import RefundList from './pages/RefundList'
import RefundShow from './pages/RefundShow'
import InventoryList from './pages/InventoryList'
import InventoryAdjust from './pages/InventoryAdjust'

function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen layout-bg flex flex-col">
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200 relative z-10">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 min-h-[5rem]">
            <div className="flex items-center">
              <NavLink to="/" className="text-primary font-bold text-3xl">商品管理系统</NavLink>
              <div className="ml-12 flex items-center gap-8">
                <NavLink to="/" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>仪表盘</NavLink>
                <NavLink to="/products" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>商品</NavLink>
                <NavLink to="/categories" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>分类</NavLink>
                <NavLink to="/orders" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>订单</NavLink>
                <NavLink to="/refunds" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>退款</NavLink>
                <NavLink to="/inventory" className={({ isActive }) => `text-lg font-medium ${isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>库存</NavLink>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-5">
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
                  <Route path="/products" element={<ProductList />} />
                  <Route path="/products/create" element={<ProductCreate />} />
                  <Route path="/products/:id/edit" element={<ProductEdit />} />
                  <Route path="/products/:id" element={<ProductShow />} />
                  <Route path="/categories" element={<CategoryList />} />
                  <Route path="/categories/create" element={<CategoryCreate />} />
                  <Route path="/categories/:id/edit" element={<CategoryEdit />} />
                  <Route path="/orders" element={<OrderList />} />
                  <Route path="/orders/create" element={<OrderCreate />} />
                  <Route path="/orders/:id" element={<OrderShow />} />
                  <Route path="/refunds" element={<RefundList />} />
                  <Route path="/refunds/:id" element={<RefundShow />} />
                  <Route path="/inventory" element={<InventoryList />} />
                  <Route path="/inventory/:productId/adjust" element={<InventoryAdjust />} />
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
