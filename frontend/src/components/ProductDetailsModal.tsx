import { useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'
import { formatInrAmount } from '../const/formatCurrency'
import { formatDateTime } from '../const/formatDate'
import { Modal } from './Modal'

type ProductDetails = {
  id: string
  name: string
  description: string | null
  sku: string
  price: string
  stock_quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

type ProductDetailsModalProps = {
  isOpen: boolean
  productId: string | null
  onClose: () => void
}

export function ProductDetailsModal({ isOpen, productId, onClose }: ProductDetailsModalProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await api.get<{ message: string; data: ProductDetails }>(`/products/${productId}`)
      return response.data.data
    },
    enabled: isOpen && Boolean(productId),
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Details" sizeClassName="max-w-2xl">
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Loading product details...
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load product details.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DetailCard label="Name" value={data.name} />
            <DetailCard label="SKU" value={data.sku} />
            <DetailCard label="Price" value={formatInrAmount(data.price)} />
            <DetailCard label="Stock" value={String(data.stock_quantity)} />
            <DetailCard label="Status" value={data.is_active ? 'Active' : 'Inactive'} />
            <DetailCard label="Product ID" value={data.id} />
            <DetailCard label="Created" value={formatDateTime(data.created_at)} />
            <DetailCard label="Updated" value={formatDateTime(data.updated_at)} />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500">Description</p>
            <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {data.description?.trim() ? data.description : 'No description provided.'}
            </p>
          </div>
        </div>
      )}
    </Modal>
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
