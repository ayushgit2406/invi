type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  sizeClassName?: string
}

export function Modal({ isOpen, onClose, title, children, sizeClassName = 'max-w-md' }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`w-full ${sizeClassName} h-[100dvh] overflow-y-auto rounded-none border border-slate-200 bg-white p-4 shadow-lg sm:h-auto sm:max-h-[90vh] sm:rounded-3xl sm:p-6`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between border-b border-slate-100 bg-white px-4 pb-4 pt-1 sm:static sm:mb-0 sm:mx-0 sm:border-b-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4 sm:mt-6">{children}</div>
      </div>
    </div>
  )
}
