import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type ApiResponse } from "../lib/api";
import { LoadingState } from "../components/LoadingState";
import { DashboardAnalytics } from "../components/DashboardAnalytics";
import type { DashboardAnalytics as DashboardAnalyticsData } from "../components/DashboardAnalytics";
import { formatInrAmount } from "../const/formatCurrency";
import { formatDateTime } from "../const/formatDate";

type DashboardStats = {
  total_products: number;
  active_products: number;
  total_customers: number;
  total_orders: number;
  inventory_value: string;
  low_stock_products: number;
};

type LowStockProduct = {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
};

type RecentOrder = {
  id: string;
  customer_id: string;
  customer_name: string;
  total_amount: string;
  status: string;
  item_count: number;
  created_at: string;
};

type DashboardResponse = ApiResponse<DashboardStats>;
type LowStockResponse = ApiResponse<LowStockProduct[]>;
type RecentOrdersResponse = ApiResponse<RecentOrder[]>;
type AnalyticsResponse = ApiResponse<DashboardAnalyticsData>;

async function fetchDashboard() {
  const response = await api.get<DashboardResponse>("/dashboard/stats");
  return response.data.data;
}

async function fetchLowStockProducts() {
  const response = await api.get<LowStockResponse>("/dashboard/low-stock");
  return response.data.data;
}

async function fetchRecentOrders() {
  const response = await api.get<RecentOrdersResponse>(
    "/dashboard/recent-orders",
  );
  return response.data.data;
}

async function fetchDashboardAnalytics() {
  const response = await api.get<AnalyticsResponse>("/dashboard/analytics", {
    params: {
      days: 30,
    },
  });
  return response.data.data;
}

export function DashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery<DashboardStats, Error, DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const { data: lowStockProducts, isLoading: lowStockLoading } = useQuery<
    LowStockProduct[],
    Error,
    LowStockProduct[]
  >({
    queryKey: ["low-stock"],
    queryFn: fetchLowStockProducts,
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery<
    RecentOrder[],
    Error,
    RecentOrder[]
  >({
    queryKey: ["recent-orders"],
    queryFn: fetchRecentOrders,
  });

  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
  } = useQuery<DashboardAnalyticsData, Error, DashboardAnalyticsData>({
    queryKey: ["dashboard-analytics"],
    queryFn: fetchDashboardAnalytics,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Overview of products, customers, orders, and inventory.
          </p>
        </div>
      </header>

      {statsLoading ? (
        <LoadingState />
      ) : statsError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
          Failed to load dashboard metrics.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Active products
            </p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              {stats?.active_products ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total customers
            </p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              {stats?.total_customers ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total orders</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              {stats?.total_orders ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Inventory value
            </p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              {formatInrAmount(stats?.inventory_value ?? 0)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Low stock products
            </p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              {stats?.low_stock_products ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              30-day revenue
            </p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              {analyticsLoading
                ? "—"
                : formatInrAmount(analytics?.total_revenue ?? 0)}
            </p>
          </div>
        </div>
      )}

      <DashboardAnalytics
        data={analytics}
        isLoading={analyticsLoading}
        isError={analyticsError}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Low Stock Products</h3>
            <Link
              to="/products?low_stock=true&sort_by=stock_quantity&sort_order=asc"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              View all
            </Link>
          </div>
          {lowStockLoading ? (
            <div className="p-6">
              <p className="text-sm text-slate-500">Loading...</p>
            </div>
          ) : lowStockProducts && lowStockProducts.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="px-6 py-4">
                  <p className="font-medium text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-500">{product.sku}</p>
                  <p className="mt-2 text-sm text-rose-600">
                    Stock: {product.stock_quantity} units
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-4 text-center text-sm text-slate-500">
              No low stock products
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Recent Orders</h3>
            <Link
              to="/orders?sort_by=created_at&sort_order=desc"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              View all
            </Link>
          </div>
          {ordersLoading ? (
            <div className="p-6">
              <p className="text-sm text-slate-500">Loading...</p>
            </div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {recentOrders.map((order) => (
                <div key={order.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {order.customer_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {order.item_count} item(s)
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {formatInrAmount(order.total_amount)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Placed {formatDateTime(order.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-4 text-center text-sm text-slate-500">
              No recent orders
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
