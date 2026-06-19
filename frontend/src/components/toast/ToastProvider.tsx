import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type ToastInput, type ToastTone } from './ToastContext'

type ToastItem = {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

const TOAST_TIMEOUT_MS = 3500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID()
    setToasts((current) => [
      ...current,
      {
        id,
        title: toast.title,
        description: toast.description,
        tone: toast.tone ?? 'success',
      },
    ])

    window.setTimeout(() => dismissToast(id), TOAST_TIMEOUT_MS)
  }, [dismissToast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-2xl border bg-white p-4 shadow-lg transition ${
            toast.tone === 'error'
              ? 'border-rose-200'
              : toast.tone === 'info'
                ? 'border-sky-200'
                : 'border-emerald-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className={`text-sm font-semibold ${
                  toast.tone === 'error'
                    ? 'text-rose-700'
                    : toast.tone === 'info'
                      ? 'text-sky-700'
                      : 'text-emerald-700'
                }`}
              >
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-1 text-sm text-slate-600">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss toast"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
