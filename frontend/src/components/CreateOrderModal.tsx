import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, type ApiResponse } from '../lib/api'
import { formatInrAmount } from '../const/formatCurrency'
import { Select } from './Select'
import { useToast } from './toast/ToastContext'
import { Modal } from './Modal'

type Product = {
  id: string
  name: string
  sku: string
  price: string
  stock_quantity: number
}

type Customer = {
  id: string
  full_name: string
  email: string
}

type ProductsResponse = ApiResponse<{ items: Product[]; total: number }>
type CustomersResponse = ApiResponse<{ items: Customer[]; total: number }>

type OrderItem = {
  product_id: string
  quantity: number
}

type CreateOrderModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState<OrderItem[]>([{ product_id: '', quantity: 1 }])
  const [error, setError] = useState('')
  const { showToast } = useToast()

  const { data: products } = useQuery<ProductsResponse['data'], Error, ProductsResponse['data']>({
    queryKey: ['products-all'],
    queryFn: async () => {
      const response = await api.get<ProductsResponse>('/products', {
        params: { page: 1, size: 100 },
      })
      return response.data.data
    },
    enabled: isOpen,
  })

  const { data: customers } = useQuery<CustomersResponse['data'], Error, CustomersResponse['data']>({
    queryKey: ['customers-all'],
    queryFn: async () => {
      const response = await api.get<CustomersResponse>('/customers', {
        params: { page: 1, size: 100 },
      })
      return response.data.data
    },
    enabled: isOpen,
  })

  const mutation = useMutation({
    mutationFn: async (orderData: { customer_id: string; items: OrderItem[] }) => {
      const response = await api.post('/orders', orderData)
      return response.data
    },
    onSuccess: () => {
      setCustomerId('')
      setItems([{ product_id: '', quantity: 1 }])
      setError('')
      showToast({
        title: 'Order created',
        description: 'Order was placed successfully.',
      })
      onSuccess()
      onClose()
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setError(error.response?.data?.message || 'Failed to create order')
        return
      }

      setError('Failed to create order')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId || items.some((item) => !item.product_id || item.quantity <= 0)) {
      setError('Please select a customer and add valid items')
      return
    }
    mutation.mutate({
      customer_id: customerId,
      items,
    })
  }

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Order" sizeClassName="max-w-3xl">
      <form className="max-h-96 space-y-4 overflow-y-auto" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700">Customer *</label>
          <Select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="mt-1"
            wrapperClassName="w-full"
          >
            <option value="">Select a customer</option>
            {customers?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Order Items *</label>
          {items.map((item, index) => (
            <div key={index} className="mb-3 flex gap-2">
              <Select
                value={item.product_id}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[index].product_id = e.target.value
                  setItems(newItems)
                }}
                className="flex-1"
                wrapperClassName="flex-1"
              >
                <option value="">Select product</option>
                {products?.items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatInrAmount(p.price)})
                  </option>
                ))}
              </Select>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[index].quantity = parseInt(e.target.value, 10) || 1
                  setItems(newItems)
                }}
                className="w-20 rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="rounded-2xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            + Add item
          </button>
        </div>

        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 sm:flex-1"
          >
            {mutation.isPending ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
