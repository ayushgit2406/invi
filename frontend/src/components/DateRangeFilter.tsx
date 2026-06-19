type DateRangeFilterProps = {
  fromValue: string
  toValue: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onClear: () => void
  className?: string
}

export function DateRangeFilter({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  onClear,
  className = '',
}: DateRangeFilterProps) {
  const hasValue = Boolean(fromValue || toValue)

  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          From
          <input
            type="date"
            value={fromValue}
            onChange={(event) => onFromChange(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          To
          <input
            type="date"
            value={toValue}
            onChange={(event) => onToChange(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasValue}
          className="h-12 self-end rounded-2xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
