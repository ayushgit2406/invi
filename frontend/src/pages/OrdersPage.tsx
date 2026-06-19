import { useState } from "react";
import { isAxiosError } from "axios";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { api, type ApiResponse } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import { LoadingState } from "../components/LoadingState";
import { CreateOrderModal } from "../components/CreateOrderModal";
import { OrderDetailsModal } from "../components/OrderDetailsModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { inr } from "../const/inr";
import { formatDateTime } from "../const/formatDate";
import { Select } from "../components/Select";
import { SortHeader } from "../components/SortHeader";
import { TableToolbar } from "../components/TableToolbar";
import { TableFooter } from "../components/TableFooter";
import { useToast } from "../components/toast/ToastContext";

type OrderRow = {
  id: string;
  customer_id: string;
  total_amount: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type OrdersResponse = ApiResponse<{
  items: OrderRow[];
  total: number;
  page: number;
  pages: number;
  size: number;
}>;

async function fetchOrders(
  page: number,
  size: number,
  search: string,
  status: string,
  createdFrom: string,
  createdTo: string,
  sortBy: string,
  sortOrder: "asc" | "desc",
): Promise<OrdersResponse["data"]> {
  const response = await api.get<OrdersResponse>("/orders", {
    params: {
      page,
      size,
      search: search || undefined,
      status: status || undefined,
      created_from: createdFrom || undefined,
      created_to: createdTo || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
  });
  return response.data.data;
}

const orderSortDefaults: Record<string, "asc" | "desc"> = {
  id: "desc",
  customer_id: "asc",
  total_amount: "desc",
  status: "asc",
  created_at: "desc",
  updated_at: "desc",
};

function parsePage(value: string | null) {
  const parsed = Number(value ?? 1);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );
  const [cancelError, setCancelError] = useState("");
  const { showToast } = useToast();

  const page = parsePage(searchParams.get("page"));
  const search = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const createdFrom = searchParams.get("created_from") ?? "";
  const createdTo = searchParams.get("created_to") ?? "";
  const sortBy = searchParams.get("sort_by") ?? "created_at";
  const sortOrder = (searchParams.get("sort_order") as "asc" | "desc") ?? "desc";

  const { data, isLoading, isError } = useQuery<
    OrdersResponse["data"],
    Error,
    OrdersResponse["data"]
  >({
    queryKey: ["orders", page, search, statusFilter, createdFrom, createdTo, sortBy, sortOrder],
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchOrders(
        page,
        10,
        search,
        statusFilter,
        createdFrom,
        createdTo,
        sortBy,
        sortOrder,
      ),
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.delete(`/orders/${orderId}`);
      return response.data;
    },
    onSuccess: () => {
      refreshOrderState();
      setCancellingOrderId(null);
      setCancelError("");
      setViewingOrderId(null);
      showToast({
        title: 'Order cancelled',
        description: 'Inventory was restored successfully.',
      });
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setCancelError(
          error.response?.data?.message || "Failed to cancel order",
        );
        return;
      }

      setCancelError("Failed to cancel order");
    },
  });

  const handleCreateSuccess = () => {
    refreshOrderState();
  };

  function refreshOrderState() {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["low-stock"] });
    queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
  }

  function updateParams(
    updates: Record<string, string | null | undefined>,
    resetPage = true,
  ) {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });

    if (resetPage) {
      next.set("page", "1");
    }

    setSearchParams(next, { replace: true });
  }

  function handleSort(column: string) {
    const nextOrder =
      sortBy === column
        ? sortOrder === "asc"
          ? "desc"
          : "asc"
        : orderSortDefaults[column] ?? "desc";

    updateParams({ sort_by: column, sort_order: nextOrder });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Orders
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Track order status, totals, and recent activity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Create order
        </button>
      </header>

      {isCreateModalOpen && (
        <CreateOrderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {viewingOrderId !== null && (
        <OrderDetailsModal
          isOpen={viewingOrderId !== null}
          orderId={viewingOrderId}
          onClose={() => setViewingOrderId(null)}
          onOrderUpdated={handleCreateSuccess}
          onCancelOrder={(orderId) => {
            setCancellingOrderId(orderId);
            setCancelError("");
          }}
        />
      )}

      {cancellingOrderId !== null && (
        <ConfirmDialog
          isOpen={cancellingOrderId !== null}
          title="Cancel order?"
          description={`Cancelling ${cancellingOrderId.slice(0, 8)} will restore inventory for all items in the order.`}
          confirmLabel="Cancel order"
          isLoading={cancelMutation.isPending}
          onConfirm={() => {
            if (!cancellingOrderId) return;
            cancelMutation.mutate(cancellingOrderId);
          }}
          onCancel={() => {
            setCancellingOrderId(null);
            setCancelError("");
          }}
        />
      )}

      {cancelError && cancellingOrderId && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {cancelError}
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
          Failed to load orders.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <TableToolbar>
            <div className="grid gap-4 xl:grid-cols-[minmax(240px,1fr)_220px_minmax(360px,1fr)] xl:items-end">
              <input
                value={search}
                onChange={(event) => updateParams({ search: event.target.value || null })}
                placeholder="Search order ID"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Status
                <Select
                  value={statusFilter}
                  onChange={(event) => updateParams({ status: event.target.value || null })}
                >
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="FULFILLED">Fulfilled</option>
                  <option value="CANCELLED">Cancelled</option>
                </Select>
              </label>
              <DateRangeFilter
                fromValue={createdFrom}
                toValue={createdTo}
                onFromChange={(value) =>
                  updateParams({ created_from: value || null })
                }
                onToChange={(value) => updateParams({ created_to: value || null })}
                onClear={() =>
                  updateParams({ created_from: null, created_to: null })
                }
              />
            </div>
          </TableToolbar>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <SortHeader label="Order ID" sortKey="id" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <SortHeader label="Customer ID" sortKey="customer_id" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                  <SortHeader label="Total" sortKey="total_amount" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <SortHeader label="Status" sortKey="status" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <SortHeader label="Created" sortKey="created_at" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="hidden lg:table-cell" />
                  <SortHeader label="Updated" sortKey="updated_at" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="hidden xl:table-cell" />
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data?.items.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-900 sm:px-4 sm:py-4">
                      {order.id.slice(0, 8)}
                    </td>
                    <td className="hidden px-3 py-3 text-slate-500 md:table-cell sm:px-4 sm:py-4">
                      {order.customer_id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-3 text-slate-700 sm:px-4 sm:py-4">
                      {inr}
                      {order.total_amount}
                    </td>
                    <td className="px-3 py-3 sm:px-4 sm:py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          order.status === "CANCELLED"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-slate-600 lg:table-cell sm:px-4 sm:py-4">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="hidden px-3 py-3 text-slate-600 xl:table-cell sm:px-4 sm:py-4">
                      {formatDateTime(order.updated_at)}
                    </td>
                    <td className="px-3 py-3 sm:px-4 sm:py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingOrderId(order.id)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCancellingOrderId(order.id);
                            setCancelError("");
                          }}
                          disabled={order.status === "CANCELLED"}
                          className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TableFooter
            itemLabel="orders"
            itemCount={data?.items.length ?? 0}
            totalCount={data?.total ?? 0}
            page={page}
            totalPages={data?.pages ?? 1}
            onPrevious={() => updateParams({ page: String(Math.max(page - 1, 1)) }, false)}
            onNext={() => updateParams({ page: String(page + 1) }, false)}
            previousDisabled={page === 1}
            nextDisabled={page >= (data?.pages ?? 1)}
          />
        </div>
      )}
    </div>
  );
}
