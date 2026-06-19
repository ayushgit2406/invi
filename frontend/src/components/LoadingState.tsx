type LoadingStateProps = {
  message?: string
}

export function LoadingState({ message = 'Loading data...' }: LoadingStateProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500 shadow-sm">
      {message}
    </div>
  )
}
