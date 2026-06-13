import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ConfirmDialogContext = createContext(null)

const defaultDialog = {
  open: false,
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  tone: 'default', // default | danger
}

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(defaultDialog)
  const resolverRef = useRef(null)

  const close = useCallback((result) => {
    if (resolverRef.current) {
      resolverRef.current(result)
      resolverRef.current = null
    }
    setDialog(defaultDialog)
  }, [])

  const confirm = useCallback((options) => {
    const config = typeof options === 'string' ? { message: options } : (options || {})
    return new Promise((resolve) => {
      if (resolverRef.current) {
        resolverRef.current(false)
      }
      resolverRef.current = resolve
      setDialog({
        open: true,
        title: config.title || '操作确认',
        message: config.message || '确认继续此操作吗？',
        confirmText: config.confirmText || '确定',
        cancelText: config.cancelText || '取消',
        tone: config.tone || 'default',
      })
    })
  }, [])

  useEffect(() => {
    if (!dialog.open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialog.open, close])

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {dialog.open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]"
            aria-label="关闭确认弹窗"
            onClick={() => close(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{dialog.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{dialog.message}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {dialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  dialog.tone === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary hover:bg-primary-hover'
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  )
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext)
  if (!ctx) throw new Error('useConfirmDialog must be used within ConfirmDialogProvider')
  return ctx
}
