import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>
type SelectFieldProps = SelectProps & {
  wrapperClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectFieldProps>(function Select(
  { className = '', wrapperClassName = 'w-full', children, ...props },
  ref,
) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        ref={ref}
        className={`w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-slate-900 shadow-sm outline-none transition duration-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={18}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  )
})
