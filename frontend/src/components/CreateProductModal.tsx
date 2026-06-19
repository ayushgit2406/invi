import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'
import { queryClient } from '../lib/queryClient'
import { useToast } from './toast/ToastContext'
import { Modal } from './Modal'

export type CreateProductInput = {
  name: string
  description?: string
  sku: string
  price: string
  stock_quantity: string
  is_active: boolean
}

type ProductDetails = {
  id: string
  name: string
  description: string | null
  sku: string
  price: string
  stock_quantity: number
  is_active: boolean
  updated_at: string
}

type ProductMode = 'create' | 'edit'

type CreateProductModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mode?: ProductMode
  productId?: string | null
}

const emptyForm: CreateProductInput = {
  name: '',
  description: '',
  sku: '',
  price: '',
  stock_quantity: '0',
  is_active: true,
}

export function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
  mode = 'create',
  productId = null,
}: CreateProductModalProps) {
  const isEditMode = mode === 'edit'

  const {
    data: product,
    isLoading: isProductLoading,
    isError: isProductError,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await api.get<{ message: string; data: ProductDetails }>(`/products/${productId}`)
      return response.data.data
    },
    enabled: isOpen && isEditMode && Boolean(productId),
  })

  if (!isOpen) {
    return null
  }

  if (isEditMode && isProductLoading && !product) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Product" sizeClassName="max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Loading product details...
        </div>
      </Modal>
    )
  }

  if (isEditMode && isProductError) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Product" sizeClassName="max-w-xl">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load product details.
        </div>
      </Modal>
    )
  }

  const initialValues: CreateProductInput = isEditMode && product
    ? {
        name: product.name,
        description: product.description ?? '',
        sku: product.sku,
        price: product.price,
        stock_quantity: String(product.stock_quantity),
        is_active: product.is_active,
      }
    : emptyForm

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Product' : 'Create Product'} sizeClassName="max-w-xl">
      <ProductForm
        key={isEditMode && product ? `${product.id}-${product.updated_at}` : 'create-product'}
        initialValues={initialValues}
        isEditMode={isEditMode}
        productId={productId}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  )
}

type ProductFormProps = {
  initialValues: CreateProductInput
  isEditMode: boolean
  productId: string | null
  onClose: () => void
  onSuccess: () => void
}

function ProductForm({ initialValues, isEditMode, productId, onClose, onSuccess }: ProductFormProps) {
  const [form, setForm] = useState<CreateProductInput>(initialValues)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  const mutation = useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const payload = {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        sku: data.sku.trim(),
        price: Number(data.price),
        stock_quantity: Number(data.stock_quantity),
        is_active: data.is_active,
      }

      if (isEditMode) {
        if (!productId) {
          throw new Error('Missing product id')
        }

        const response = await api.put(`/products/${productId}`, payload)
        return response.data
      }

      const response = await api.post('/products', payload)
      return response.data
    },
    onSuccess: () => {
      if (isEditMode && productId) {
        queryClient.invalidateQueries({ queryKey: ['product', productId] })
      }
      setError('')
      showToast({
        title: isEditMode ? 'Product updated' : 'Product created',
        description: isEditMode ? 'Product details were saved successfully.' : 'New product was added successfully.',
      })
      onSuccess()
      onClose()
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setError(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} product`)
        return
      }

      setError(`Failed to ${isEditMode ? 'update' : 'create'} product`)
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const price = Number(form.price)
    const stockQuantity = Number(form.stock_quantity)

    if (!form.name.trim() || !form.sku.trim() || !form.price) {
      setError('Please fill in all required fields')
      return
    }

    if (Number.isNaN(price) || price <= 0) {
      setError('Price must be greater than 0')
      return
    }

    if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
      setError('Stock quantity cannot be negative')
      return
    }

    mutation.mutate(form)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Product Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="Product name"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">SKU *</label>
          <input
            type="text"
            value={form.sku}
            onChange={(event) => setForm({ ...form, sku: event.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="SKU-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Price *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Stock Quantity *</label>
          <input
            type="number"
            min="0"
            value={form.stock_quantity}
            onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="0"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="Short description (optional)"
            rows={3}
          />
        </div>

        {isEditMode && (
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
            />
            Active product
          </label>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
        >
          {mutation.isPending ? 'Saving...' : isEditMode ? 'Save changes' : 'Create product'}
        </button>
      </div>
    </form>
  )
}
