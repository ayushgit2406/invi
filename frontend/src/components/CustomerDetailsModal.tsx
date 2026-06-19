import { useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'
import { formatDateTime } from '../const/formatDate'
import { Modal } from './Modal'

type CustomerDetails = {
  id: string
  full_name: string
  email: string
  phone_number: string
  created_at: string
  updated_at: string
}

type CustomerDetailsModalProps = {
  isOpen: boolean
  customerId: string | null
  onClose: () => void
}

export function CustomerDetailsModal({ isOpen, customerId, onClose }: CustomerDetailsModalProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const response = await api.get<{ message: string; data: CustomerDetails }>(`/customers/${customerId}`)
      return response.data.data
    },
    enabled: isOpen && Boolean(customerId),
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Details" sizeClassName="max-w-2xl">
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Loading customer details...
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load customer details.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailCard label="Full name" value={data.full_name} />
          <DetailCard label="Email" value={data.email} />
          <DetailCard label="Phone" value={data.phone_number} />
          <DetailCard label="Customer ID" value={data.id} />
          <DetailCard label="Created" value={formatDateTime(data.created_at)} />
          <DetailCard label="Updated" value={formatDateTime(data.updated_at)} />
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
