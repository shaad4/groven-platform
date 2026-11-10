import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import clientsApi from '../../api/clients.api'

function Backdrop({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  )
}

export default function DeleteClientModal({ client, onClose, onSuccess }) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const displayName = client.display_name || client.client_name || 'Client'
  const canDelete = confirmText === 'DELETE'

  const handleDelete = async () => {
    if (!canDelete) return
    setLoading(true)
    setError('')
    try {
      await clientsApi.delete(client.id)
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="w-full max-w-[420px] rounded-[24px] bg-white shadow-[0px_24px_60px_rgba(10,46,36,0.14)] overflow-hidden">

        <div className="p-8 flex flex-col items-center text-center">

          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-100 bg-red-50">
            <AlertTriangle size={24} className="text-red-500" />
          </div>

          <h2 className="mt-5 text-[20px] font-semibold text-[#141a14]">
            Delete {displayName}?
          </h2>

          <p className="mt-3 max-w-[300px] text-[13px] leading-6 text-[#9ea89e]">
            This will permanently remove{' '}
            <span className="font-medium text-[#4a544a]">{displayName.split(' ')[0]}'s</span>
            {' '}portal access and all associated request data. This cannot be undone.
          </p>

          {/* Type to confirm */}
          <div className="mt-6 w-full text-left">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DELETE"
              className="h-12 w-full rounded-xl border border-[#e8eae8] bg-[#f7f8f7] px-4 text-[14px] text-[#141a14] tracking-widest outline-none transition-all placeholder:text-[#c8cac8] placeholder:tracking-widest focus:border-red-300 focus:ring-4 focus:ring-red-100"
            />
          </div>

          {error && (
            <div className="mt-4 w-full rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <button
            onClick={handleDelete}
            disabled={!canDelete || loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-3.5 text-[14px] font-medium text-white transition-all hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Delete client
          </button>

          <button
            onClick={onClose}
            className="mt-3 text-[13px] text-[#9ea89e] hover:text-[#4a544a] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Backdrop>
  )
}