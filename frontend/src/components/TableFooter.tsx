type TableFooterProps = {
  itemLabel: string
  itemCount: number
  totalCount: number
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
  previousDisabled: boolean
  nextDisabled: boolean
}

export function TableFooter({
  itemLabel,
  itemCount,
  totalCount,
  page,
  totalPages,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
}: TableFooterProps) {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-4">
      <div className="text-sm text-slate-600">
        Showing {itemCount} of {totalCount} {itemLabel}
      </div>
      <div className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={previousDisabled}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
