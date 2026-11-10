import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import AdminSlidePanel, { PanelHeader, PanelBody, PanelFooter } from '../ui/AdminSlidePanel'
import { AdminButton } from '../ui/AdminUI'

export default function ConfirmActionModal({
  open,
  onClose,
  title,
  description,
  targetName,
  confirmLabel = 'Confirm',
  tone = 'danger', // 'danger' | 'accent'
  onConfirm,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setError('')
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminSlidePanel open={open} onClose={onClose} width={420} tone={tone}>
      <PanelHeader
        eyebrow="Confirm action"
        title={title}
        onClose={onClose}
      />
      <PanelBody>
        <div className="flex items-start gap-3 rounded-xl border border-[#F3D2CE] bg-[#FDF1EF] p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#C73A30]" />
          <div>
            <p className="text-[13px] font-medium text-[#10241C]">{targetName}</p>
            <p className="mt-1 text-[13px] leading-5 text-[#5B655C]">{description}</p>
          </div>
        </div>

        <p className="mt-4 text-[12px] font-medium text-[#8B958C]">
          This action cannot be undone.
        </p>

        {error && (
          <p className="mt-3 text-[12px] text-[#C73A30]">{error}</p>
        )}
      </PanelBody>
      <PanelFooter>
        <AdminButton variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </AdminButton>
        <AdminButton
          variant={tone === 'danger' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          loading={loading}
        >
          {confirmLabel}
        </AdminButton>
      </PanelFooter>
    </AdminSlidePanel>
  )
}