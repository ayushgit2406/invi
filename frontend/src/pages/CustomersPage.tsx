import { useState } from 'react'
import { isAxiosError } from 'axios'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

import { api, type ApiResponse } from '../lib/api'
import { queryClient } from '../lib/queryClient'
import { LoadingState } from '../components/LoadingState'
import { CreateCustomerModal } from '../components/CreateCustomerModal'
import { CustomerDetailsModal } from '../components/CustomerDetailsModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DateRangeFilter } from '../components/DateRangeFilter'
import { formatDateTime } from '../const/formatDate'
import { TableToolbar } from '../components/TableToolbar'
import { TableFooter } from '../components/TableFooter'
import { SortHeader } from '../components/SortHeader'
import { useToast } from '../components/toast/ToastContext'

type CustomerRow = {
  id: string
  full_name: string
  email: string
  phone_number: string
  created_at: string
  updated_at: string
}

type CustomersResponse = ApiResponse<{
  items: CustomerRow[]
  total: number
  page: number
  pages: number
  size: number
}>

async function fetchCustomers(
  page: number,
  size: number,
  search: string,
  createdFrom: string,
  createdTo: string,
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Promise<CustomersResponse['data']> {
  const response = await api.get<CustomersResponse>('/customers', {
    params: {
      page,
      size,
      search: search || undefined,
      created_from: createdFrom || undefined,
      created_to: createdTo || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
  })
  return response.data.data
}

const customerSortDefaults: Record<string, 'asc' | 'desc'> = {
  full_name: 'asc',
  email: 'asc',
  phone_number: 'asc',
  created_at: 'desc',
  updated_at: 'desc',
}

function parsePage(value: string | null) {
  const parsed = Number(value ?? 1)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRow | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const { showToast } = useToast()

  const page = parsePage(searchParams.get('page'))
  const search = searchParams.get('search') ?? ''
  const createdFrom = searchParams.get('created_from') ?? ''
  const createdTo = searchParams.get('created_to') ?? ''
  const sortBy = searchParams.get('sort_by') ?? 'created_at'
  const sortOrder = (searchParams.get('sort_order') as 'asc' | 'desc') ?? 'desc'

  const { data, isLoading, isError } = useQuery<CustomersResponse['data'], Error, CustomersResponse['data']>({
    queryKey: ['customers', page, search, createdFrom, createdTo, sortBy, sortOrder],
    queryFn: async () => {
      return fetchCustomers(page, 10, search, createdFrom, createdTo, sortBy, sortOrder)
    },
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await api.delete(`/customers/${customerId}`)
      return response.data
    },
    onSuccess: () => {
      refreshCustomerState()
      setDeletingCustomer(null)
      setDeleteError('')
      showToast({
        title: 'Customer deleted',
        description: 'Customer record was removed successfully.',
      })
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setDeleteError(error.response?.data?.message || 'Failed to delete customer')
        return
      }

      setDeleteError('Failed to delete customer')
    },
  })

  const handleCreateSuccess = () => {
    refreshCustomerState()
  }

  function refreshCustomerState() {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  function updateParams(
    updates: Record<string, string | null | undefined>,
    resetPage = true,
  ) {
    const next = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    })

    if (resetPage) {
      next.set('page', '1')
    }

    setSearchParams(next, { replace: true })
  }

  function handleSort(column: string) {
    const nextOrder =
      sortBy === column
        ? sortOrder === 'asc'
          ? 'desc'
          : 'asc'
        : customerSortDefaults[column] ?? 'desc'

    updateParams({ sort_by: column, sort_order: nextOrder })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Customers</h2>
          <p className="mt-1 text-sm text-slate-500">Search and manage customer records.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add customer
        </button>
      </header>

      {isCreateModalOpen && (
        <CreateCustomerModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {viewingCustomerId !== null && (
        <CustomerDetailsModal
          isOpen={viewingCustomerId !== null}
          customerId={viewingCustomerId}
          onClose={() => setViewingCustomerId(null)}
        />
      )}

      {deletingCustomer !== null && (
        <ConfirmDialog
          isOpen={deletingCustomer !== null}
          title="Delete customer?"
          description={`This will remove ${deletingCustomer?.full_name ?? 'the selected customer'} from active records. Customers with existing orders cannot be deleted.`}
          confirmLabel="Delete customer"
          isLoading={deleteMutation.isPending}
          onConfirm={() => {
            if (!deletingCustomer) return
            deleteMutation.mutate(deletingCustomer.id)
          }}
          onCancel={() => {
            setDeletingCustomer(null)
            setDeleteError('')
          }}
        />
      )}

      {deleteError && deletingCustomer && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {deleteError}
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
          Failed to load customers.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <TableToolbar>
            <div className="grid gap-3 xl:grid-cols-[minmax(280px,360px)_minmax(360px,1fr)] xl:items-end">
              <input
                value={search}
                onChange={(event) => updateParams({ search: event.target.value || null })}
                placeholder="Search customers"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
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
                  <SortHeader label="Name" sortKey="full_name" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <SortHeader label="Email" sortKey="email" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <SortHeader label="Phone" sortKey="phone_number" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                  <SortHeader label="Created" sortKey="created_at" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="hidden lg:table-cell" />
                  <SortHeader label="Updated" sortKey="updated_at" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="hidden xl:table-cell" />
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data?.items.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-900 sm:px-4 sm:py-4">{customer.full_name}</td>
                    <td className="px-3 py-3 text-slate-500 sm:px-4 sm:py-4">{customer.email}</td>
                    <td className="hidden px-3 py-3 text-slate-700 md:table-cell sm:px-4 sm:py-4">{customer.phone_number}</td>
                    <td className="hidden px-3 py-3 text-slate-600 lg:table-cell sm:px-4 sm:py-4">
                      {formatDateTime(customer.created_at)}
                    </td>
                    <td className="hidden px-3 py-3 text-slate-600 xl:table-cell sm:px-4 sm:py-4">
                      {formatDateTime(customer.updated_at)}
                    </td>
                    <td className="px-3 py-3 sm:px-4 sm:py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingCustomerId(customer.id)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingCustomer(customer)
                            setDeleteError('')
                          }}
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
            itemLabel="customers"
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
  )
}
