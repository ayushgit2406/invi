import type { ReactNode } from "react";

type TableToolbarProps = {
  children: ReactNode;
};

export function TableToolbar({ children }: TableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-3 sm:p-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="grid gap-3 sm:gap-4 xl:flex-1 xl:items-end">{children}</div>
    </div>
  );
}
