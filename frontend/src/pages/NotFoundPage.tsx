import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Page not found</p>
      <h1 className="mt-4 text-3xl font-semibold text-slate-900">Oops, this page doesn't exist.</h1>
      <p className="mt-2 text-sm text-slate-500">Return to the dashboard or choose another page.</p>
      <Link className="mt-6 inline-flex rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" to="/dashboard">
        Go to dashboard
      </Link>
    </div>
  )
}
