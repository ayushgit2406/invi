import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react'

type SortDirection = 'asc' | 'desc'

type SortHeaderProps = {
  label: string
  sortKey: string
  currentSortBy: string
  currentSortOrder: SortDirection
  onSort: (sortKey: string) => void
  align?: 'left' | 'right'
  className?: string
}

export function SortHeader({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
  align = 'left',
  className = '',
}: SortHeaderProps) {
  const isActive = currentSortBy === sortKey

  return (
    <th className={`px-3 py-3 font-medium sm:px-4 sm:py-4 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 text-slate-600 transition hover:text-slate-900 ${
          align === 'right' ? 'ml-auto' : ''
        }`}
      >
        <span>{label}</span>
        {isActive ? (
          currentSortOrder === 'asc' ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )
        ) : (
          <ArrowUpDown size={14} />
        )}
      </button>
    </th>
  )
}
