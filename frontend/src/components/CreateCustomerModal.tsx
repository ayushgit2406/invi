import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from './toast/ToastContext'
import { Modal } from './Modal'

export type CreateCustomerInput = {
  full_name: string
  email: string
  phone_number: string
}

type CreateCustomerModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const [form, setForm] = useState<CreateCustomerInput>({
    full_name: '',
    email: '',
    phone_number: '',
  })
  const [error, setError] = useState('')
  const { showToast } = useToast()

  const mutation = useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const response = await api.post('/customers', data)
      return response.data
    },
    onSuccess: () => {
      setForm({ full_name: '', email: '', phone_number: '' })
      setError('')
      showToast({
        title: 'Customer created',
        description: 'Customer record was added successfully.',
      })
      onSuccess()
      onClose()
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setError(error.response?.data?.message || 'Failed to create customer')
        return
      }

      setError('Failed to create customer')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.phone_number) {
      setError('Please fill in all required fields')
      return
    }
    mutation.mutate(form)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Customer" sizeClassName="max-w-lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700">Full Name *</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="name@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Phone Number *</label>
          <input
            type="tel"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="+1 555 123 4567"
          />
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
            {mutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
