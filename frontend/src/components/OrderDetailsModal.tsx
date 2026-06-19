import { useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'
import { formatInrAmount } from '../const/formatCurrency'
import { formatDateTime } from '../const/formatDate'
import { Select } from './Select'
import { useToast } from './toast/ToastContext'
import { Modal } from './Modal'

type OrderStatusValue =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'FULFILLED'
  | 'CANCELLED'

const orderStatusOptions: OrderStatusValue[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'FULFILLED',
  'CANCELLED',
]

type OrderItem = {
  product_id: string
  quantity: number
  price: string
}

type OrderDetails = {
  id: string
  customer_id: string
  total_amount: string
  status: OrderStatusValue
  items: OrderItem[]
  created_at: string
  updated_at: string
}

type CustomerDetails = {
  id: string
  full_name: string
  email: string
  phone_number: string
  created_at: string
  updated_at: string
}

type ProductRow = {
  id: string
  name: string
  sku: string
}

type OrderDetailsModalProps = {
  isOpen: boolean
  orderId: string | null
  onClose: () => void
  onCancelOrder: (orderId: string) => void
  onOrderUpdated: () => void
}

export function OrderDetailsModal({
  isOpen,
  orderId,
  onClose,
  onCancelOrder,
  onOrderUpdated,
}: OrderDetailsModalProps) {
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await api.get<{ message: string; data: OrderDetails }>(
        `/orders/${orderId}`,
      )
      return response.data.data
    },
    enabled: isOpen && Boolean(orderId),
  })

  const { data: customer } = useQuery({
    queryKey: ['order-customer', order?.customer_id],
    queryFn: async () => {
      const response = await api.get<{ message: string; data: CustomerDetails }>(
        `/customers/${order?.customer_id}`,
      )
      return response.data.data
    },
    enabled: isOpen && Boolean(order?.customer_id),
  })

  const { data: products } = useQuery({
    queryKey: ['order-products'],
    queryFn: async () => {
      const response = await api.get<{ message: string; data: { items: ProductRow[] } }>(
        '/products',
        {
          params: { page: 1, size: 100 },
        },
      )
      return response.data.data.items
    },
    enabled: isOpen,
  })

  const productNameById = useMemo(
    () => new Map((products ?? []).map((product) => [product.id, product])),
    [products],
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Order Details" sizeClassName="max-w-4xl">
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Loading order details...
        </div>
      ) : isError || !order ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load order details.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DetailCard label="Order ID" value={order.id} />
            <DetailCard label="Status" value={order.status} />
            <DetailCard label="Total" value={formatInrAmount(order.total_amount)} />
            <DetailCard label="Customer" value={customer ? customer.full_name : order.customer_id} />
            <DetailCard label="Created" value={formatDateTime(order.created_at)} />
            <DetailCard label="Updated" value={formatDateTime(order.updated_at)} />
          </div>

          <OrderStatusEditor
            key={`${order.id}-${order.status}`}
            orderId={order.id}
            initialStatus={order.status}
            onSaved={onOrderUpdated}
            disabled={order.status === 'CANCELLED'}
          />

          {customer && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Customer details
              </p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <DetailRow label="Name" value={customer.full_name} />
                <DetailRow label="Email" value={customer.email} />
                <DetailRow label="Phone" value={customer.phone_number} />
                <DetailRow label="Created" value={formatDateTime(customer.created_at)} />
                <DetailRow label="Updated" value={formatDateTime(customer.updated_at)} />
              </dl>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Items
              </h4>
              <span className="text-sm text-slate-500">
                {order.items.length} line item(s)
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Product ID</th>
                    <th className="px-4 py-3 font-medium">Qty</th>
                    <th className="px-4 py-3 font-medium">Unit Price</th>
                    <th className="px-4 py-3 font-medium">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {order.items.map((item) => {
                    const product = productNameById.get(item.product_id)
                    const lineTotal = Number(item.price) * item.quantity

                    return (
                      <tr key={`${item.product_id}-${item.quantity}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900">
                          {product?.name ?? 'Unknown product'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{item.product_id}</td>
                        <td className="px-4 py-3 text-slate-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatInrAmount(item.price)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {formatInrAmount(lineTotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:flex-1"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onCancelOrder(order.id)}
              disabled={order.status === 'CANCELLED'}
              className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:flex-1"
            >
              {order.status === 'CANCELLED' ? 'Already cancelled' : 'Cancel order'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

type OrderStatusEditorProps = {
  orderId: string
  initialStatus: OrderStatusValue
  disabled?: boolean
  onSaved: () => void
}

function OrderStatusEditor({
  orderId,
  initialStatus,
  disabled = false,
  onSaved,
}: OrderStatusEditorProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatusValue>(initialStatus)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  const mutation = useMutation({
    mutationFn: async (status: OrderStatusValue) => {
      const response = await api.patch(`/orders/${orderId}/status`, { status })
      return response.data
    },
    onSuccess: () => {
      setError('')
      showToast({
        title: 'Order status updated',
        description: `Order moved to ${selectedStatus}.`,
      })
      onSaved()
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setError(error.response?.data?.message || 'Failed to update order status')
        return
      }

      setError('Failed to update order status')
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (selectedStatus === initialStatus) {
      setError('Choose a different status before saving')
      return
    }
    mutation.mutate(selectedStatus)
  }

  return (
    <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Update status</label>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as OrderStatusValue)}
            disabled={disabled || mutation.isPending}
            wrapperClassName="flex-1"
          >
            {orderStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>

          <button
            type="submit"
            disabled={disabled || mutation.isPending || selectedStatus === initialStatus}
            className="h-12 w-full rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 md:w-auto"
          >
            {mutation.isPending ? 'Saving...' : 'Save status'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {disabled
            ? 'This order is cancelled and can no longer be updated.'
            : 'Backend transition rules still apply.'}
        </p>
      </div>

      {error && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </form>
  )
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">
        {value}
      </dd>
    </div>
  )
}
