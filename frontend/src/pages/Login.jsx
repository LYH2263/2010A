import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function Login() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (e) {
      showToast(e.message || '登录失败，请检查邮箱和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#fff9f3] px-4 py-12 flex items-center justify-center">
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-8 shadow-[0_24px_60px_-28px_rgba(251,146,60,0.55)] backdrop-blur-xl">
        <div className="text-center mb-7">
          <span className="inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold tracking-wide text-orange-700">
            管理后台
          </span>
          <h1 className="text-3xl font-black text-gray-800 mt-3 tracking-tight">商品管理系统</h1>
          <p className="text-gray-500 text-sm mt-2">请输入管理员账号登录系统</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">邮箱</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">@</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-9 py-2.5 text-gray-800 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                placeholder="请输入邮箱地址"
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-20 text-gray-800 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                placeholder="请输入密码"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 text-sm font-medium text-gray-500 hover:text-primary"
              >
                {showPassword ? '隐藏' : '显示'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-primary to-[#ff8b3d] px-4 py-2.5 font-semibold text-white shadow-lg shadow-orange-200/70 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '登录中...' : '登录系统'}
          </button>
        </form>
      </div>
    </main>
  )
}
