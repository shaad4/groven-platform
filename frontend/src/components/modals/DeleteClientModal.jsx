import { useDialogFocus } from '../../hooks/useDialogFocus'
import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import clientsApi from '../../api/clients.api'

function Backdrop({ children, onClose }) {
  const dialogRef = useDialogFocus(true, onClose)
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
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
      <div className="w-full max-h-[calc(100dvh-32px)] max-w-[420px] rounded-[24px] bg-layout-card shadow-[0px_24px_60px_rgba(10,46,36,0.14)] overflow-y-auto">

        <div className="p-8 flex flex-col items-center text-center">

          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-status-danger-text/25 bg-status-danger-bg">
            <AlertTriangle size={24} className="text-status-danger-text" />
          </div>

          <h2 className="mt-5 text-[20px] font-semibold text-text-main">
            Delete {displayName}?
          </h2>

          <p className="mt-3 max-w-[300px] text-[13px] leading-6 text-text-dim">
            This will permanently remove{' '}
            <span className="font-medium text-text-sub">{displayName.split(' ')[0]}'s</span>
            {' '}portal access and all associated request data. This cannot be undone.
          </p>

          {/* Type to confirm */}
          <div className="mt-6 w-full text-left">
            <label htmlFor="delete-client-confirmation" className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-dim">
              Type DELETE to confirm
            </label>
            <input
              id="delete-client-confirmation" type="text" autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DELETE"
              className="h-12 w-full rounded-xl border border-border bg-layout-page px-4 text-[14px] text-text-main tracking-widest outline-none transition-all placeholder:text-text-dim placeholder:tracking-widest focus:border-status-danger-text/25 focus:ring-4 focus:ring-status-danger-text/15"
            />
          </div>

          {error && (
            <div role="alert" className="mt-4 w-full rounded-xl bg-status-danger-bg border border-status-danger-text/25 px-4 py-3">
              <p className="text-[13px] text-status-danger-text">{error}</p>
            </div>
          )}

          {/* Actions */}
          <button
            onClick={handleDelete}
            disabled={!canDelete || loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-[14px] font-medium text-on-primary transition-all hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Delete client
          </button>

          <button
            onClick={onClose}
            className="mt-3 text-[13px] text-text-dim hover:text-text-sub transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Backdrop>
  )
}
