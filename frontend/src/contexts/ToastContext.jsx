import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

const AUTO_HIDE_MS = 3500

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const [type, setType] = useState('error') // 'error' | 'success'
  const timerRef = useRef(null)

  const showToast = useCallback((msg, toastType = 'error') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(msg || '操作失败')
    setType(toastType)
    setVisible(true)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      timerRef.current = null
    }, AUTO_HIDE_MS)
  }, [])

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {visible && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[calc(100%-2rem)]"
          role="alert"
        >
          <div
            className={`rounded-xl border-2 shadow-lg px-4 py-3 flex items-start gap-3 ${
              type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span className="flex-1 text-sm font-medium">{message}</span>
            <button
              type="button"
              onClick={hideToast}
              className="shrink-0 text-current opacity-70 hover:opacity-100"
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
