import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Users,
  ShoppingCart,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Boxes },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
];

type SidebarProps = {
  mobileOpen: boolean;
  desktopCollapsed: boolean;
  onToggleDesktopCollapsed: () => void;
  onMobileClose: () => void;
};

export function Sidebar({
  mobileOpen,
  desktopCollapsed,
  onToggleDesktopCollapsed,
  onMobileClose,
}: SidebarProps) {
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  function renderNav({ collapsed }: { collapsed: boolean }) {
    return (
      <nav className={`flex-1 px-3 ${collapsed ? "py-4" : "py-6"}`}>
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `mb-2 flex min-h-[52px] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  collapsed ? "justify-center px-3" : ""
                } ${
                  isActive
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    );
  }

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-slate-50/95 backdrop-blur-sm transition-[width] duration-300 lg:flex ${
          desktopCollapsed ? "w-20" : "w-72"
        }`}
      >
        {desktopCollapsed ? (
          <div className="flex flex-col items-center gap-3 px-2 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
              IA
            </div>
            <button
              type="button"
              onClick={onToggleDesktopCollapsed}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3 px-3 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
                IA
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Invi Admin
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleDesktopCollapsed}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        )}

        {renderNav({ collapsed: desktopCollapsed })}
      </aside>

      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-200 ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-slate-950/40"
          onClick={onMobileClose}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[82vw] max-w-sm flex-col border-r border-slate-200 bg-slate-50 shadow-2xl shadow-slate-900/20 transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
                IA
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Invi Admin
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onMobileClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>

          {renderNav({ collapsed: false })}
        </aside>
      </div>
    </>
  );
}
