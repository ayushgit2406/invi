import { useState } from "react";
import { isAxiosError } from "axios";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { api, type ApiResponse } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import { LoadingState } from "../components/LoadingState";
import { CreateProductModal } from "../components/CreateProductModal";
import { ProductDetailsModal } from "../components/ProductDetailsModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { Select } from "../components/Select";
import { SortHeader } from "../components/SortHeader";
import { TableToolbar } from "../components/TableToolbar";
import { TableFooter } from "../components/TableFooter";
import { inr } from "../const/inr";
import { formatDateTime } from "../const/formatDate";
import { useToast } from "../components/toast/ToastContext";

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  price: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductsResponse = ApiResponse<{
  items: ProductRow[];
  total: number;
  page: number;
  pages: number;
  size: number;
}>;

async function fetchProducts(
  page: number,
  size: number,
  search: string,
  isActive: boolean | undefined,
  lowStock: boolean,
  createdFrom: string,
  createdTo: string,
  sortBy: string,
  sortOrder: "asc" | "desc",
): Promise<ProductsResponse["data"]> {
  const response = await api.get<ProductsResponse>("/products", {
    params: {
      page,
      size,
      search: search || undefined,
      is_active: isActive,
      low_stock: lowStock || undefined,
      created_from: createdFrom || undefined,
      created_to: createdTo || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
  });
  return response.data.data;
}

const productSortDefaults: Record<string, "asc" | "desc"> = {
  name: "asc",
  sku: "asc",
  price: "asc",
  stock_quantity: "asc",
  created_at: "desc",
  updated_at: "desc",
};

function parsePage(value: string | null) {
  const parsed = Number(value ?? 1);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState("");
  const { showToast } = useToast();

  const page = parsePage(searchParams.get("page"));
  const search = searchParams.get("search") ?? "";
  const activeFilter = searchParams.get("is_active") ?? "";
  const lowStock = searchParams.get("low_stock") === "true";
  const createdFrom = searchParams.get("created_from") ?? "";
  const createdTo = searchParams.get("created_to") ?? "";
  const sortBy = searchParams.get("sort_by") ?? "created_at";
  const sortOrder = (searchParams.get("sort_order") as "asc" | "desc") ?? "desc";
  const isActive =
    activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined;

  const { data, isLoading, isError } = useQuery<
    ProductsResponse["data"],
    Error,
    ProductsResponse["data"]
  >({
    queryKey: [
      "products",
      page,
      search,
      activeFilter,
      lowStock,
      createdFrom,
      createdTo,
      sortBy,
      sortOrder,
    ],
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchProducts(
        page,
        10,
        search,
        isActive,
        lowStock,
        createdFrom,
        createdTo,
        sortBy,
        sortOrder,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await api.delete(`/products/${productId}`);
      return response.data;
    },
    onSuccess: () => {
      refreshInventoryState();
      setDeletingProduct(null);
      setDeleteError("");
      setViewingProductId(null);
      setEditingProductId(null);
      showToast({
        title: 'Product deleted',
        description: 'Product was removed successfully.',
      });
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setDeleteError(
          error.response?.data?.message || "Failed to delete product",
        );
        return;
      }

      setDeleteError("Failed to delete product");
    },
  });

  const handleMutationSuccess = () => {
    refreshInventoryState();
  };

  function refreshInventoryState() {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["low-stock"] });
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
        : productSortDefaults[column] ?? "desc";

    updateParams({ sort_by: column, sort_order: nextOrder });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Products
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage product inventory, pricing, and stock.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add product
        </button>
      </header>

      {isCreateModalOpen && (
        <CreateProductModal
          isOpen={isCreateModalOpen}
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleMutationSuccess}
        />
      )}

      {editingProductId !== null && (
        <CreateProductModal
          isOpen={editingProductId !== null}
          mode="edit"
          productId={editingProductId}
          onClose={() => setEditingProductId(null)}
          onSuccess={handleMutationSuccess}
        />
      )}

      {viewingProductId !== null && (
        <ProductDetailsModal
          isOpen={viewingProductId !== null}
          productId={viewingProductId}
          onClose={() => setViewingProductId(null)}
        />
      )}

      {deletingProduct !== null && (
        <ConfirmDialog
          isOpen={deletingProduct !== null}
          title="Delete product?"
          description={`This will permanently remove ${deletingProduct?.name ?? "the selected product"} from the active catalog. Products linked to orders cannot be deleted.`}
          confirmLabel="Delete product"
          isLoading={deleteMutation.isPending}
          onConfirm={() => {
            if (!deletingProduct) return;
            deleteMutation.mutate(deletingProduct.id);
          }}
          onCancel={() => {
            setDeletingProduct(null);
            setDeleteError("");
          }}
        />
      )}

      {deleteError && deletingProduct && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {deleteError}
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
          Failed to load products.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <TableToolbar>
            <div className="grid gap-3 xl:grid-cols-[minmax(280px,360px)_220px_minmax(360px,1fr)] xl:items-end">
              <input
                value={search}
                onChange={(event) => updateParams({ search: event.target.value || null })}
                placeholder="Search products"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Status
                <Select
                  value={activeFilter}
                  onChange={(event) => updateParams({ is_active: event.target.value || null })}
                >
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </label>
              <DateRangeFilter
                fromValue={createdFrom}
                toValue={createdTo}
                onFromChange={(value) => updateParams({ created_from: value || null })}
                onToChange={(value) => updateParams({ created_to: value || null })}
                onClear={() => updateParams({ created_from: null, created_to: null })}
              />
            </div>
          </TableToolbar>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <SortHeader label="Name" sortKey="name" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <SortHeader label="SKU" sortKey="sku" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                  <SortHeader label="Price" sortKey="price" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <SortHeader label="Stock" sortKey="stock_quantity" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <th className="px-4 py-4 font-medium">Status</th>
                  <SortHeader label="Created" sortKey="created_at" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="hidden lg:table-cell" />
                  <SortHeader label="Updated" sortKey="updated_at" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="hidden xl:table-cell" />
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data?.items.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-900 sm:px-4 sm:py-4">{product.name}</td>
                    <td className="hidden px-3 py-3 text-slate-500 md:table-cell sm:px-4 sm:py-4">{product.sku}</td>
                    <td className="px-3 py-3 text-slate-700 sm:px-4 sm:py-4">
                      {inr}
                      {product.price}
                    </td>
                    <td className="px-3 py-3 text-slate-700 sm:px-4 sm:py-4">
                      {product.stock_quantity}
                    </td>
                    <td className="px-3 py-3 sm:px-4 sm:py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          product.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-slate-600 lg:table-cell sm:px-4 sm:py-4">
                      {formatDateTime(product.created_at)}
                    </td>
                    <td className="hidden px-3 py-3 text-slate-600 xl:table-cell sm:px-4 sm:py-4">
                      {formatDateTime(product.updated_at)}
                    </td>
                    <td className="px-3 py-3 sm:px-4 sm:py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingProductId(product.id)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProductId(product.id)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(product)}
                          className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TableFooter
            itemLabel="products"
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
