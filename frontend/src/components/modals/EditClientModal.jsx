import { useDialogFocus } from '../../hooks/useDialogFocus'
import { useState, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import clientsApi from '../../api/clients.api'
import { BUSINESS_TYPES } from '../../utils/clientHelpers'

// ─── BACKDROP ─────────────────────────────────────────────────
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

// ─── TAG INPUT ────────────────────────────────────────────────
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const addTag = (val) => {
    const name = val.trim()
    if (!name || tags.includes(name) || tags.length >= 10) { setInput(''); return }
    onChange([...tags, name])
    setInput('')
  }

  const removeTag = (name) => onChange(tags.filter(t => t !== name))

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input) }
    if (e.key === 'Backspace' && !input && tags.length) removeTag(tags[tags.length - 1])
  }

  return (
    <div
      className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2 cursor-text focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all bg-layout-card"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(name => {
        const c = { bg: 'var(--primary-light)', dot: 'var(--primary-text)', text: 'var(--primary-text)' }
        return (
          <span
            key={name}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
            style={{ background: c.bg, color: c.text }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
            {name}
            <button
              type="button" aria-label={`Remove tag ${name}`}
              onClick={(e) => { e.stopPropagation(); removeTag(name) }}
              className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </span>
        )
      })}
      <input
        ref={inputRef} aria-label="Client tags"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? 'Add tag...' : ''}
        className="min-w-[100px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-dim"
      />
    </div>
  )
}

// ─── BUSINESS TYPE DROPDOWN ───────────────────────────────────
function BusinessTypeSelect({ value, onChange }) {
  return (
    <select aria-label="Business type" value={value} onChange={event => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-layout-card px-3 text-base text-text-main outline-none transition-colors focus:border-primary sm:text-sm">
      <option value="">Select business type</option>
      {BUSINESS_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
    </select>
  )
}

// ─── MAIN MODAL ───────────────────────────────────────────────
export default function EditClientModal({ client, onClose, onSuccess }) {
  const [form, setForm] = useState({
    business_type: client.business_type || '',
    private_note: client.private_note || '',
    tags: (client.tags || []).map(t => (typeof t === 'string' ? t : t.name)),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const displayName = client.display_name || client.client_name || 'Client'

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      await clientsApi.update(client.id, {
        business_type: form.business_type || '',
        private_note: form.private_note,
        tags: form.tags,
      })
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
      <div className="w-full max-h-[calc(100dvh-32px)] max-w-[520px] rounded-[24px] border border-border bg-layout-card shadow-[0px_24px_60px_rgba(10,46,36,0.14)] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-[17px] font-semibold text-text-main">Edit details</h2>
            <p className="mt-0.5 text-[12px] text-text-dim">{displayName}</p>
          </div>
          <button
            onClick={onClose} aria-label="Close dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-layout-page hover:bg-surface transition-colors"
          >
            <X size={16} className="text-text-sub" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">

          {/* Business Type */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-dim">
              Business Type
            </label>
            <BusinessTypeSelect
              value={form.business_type}
              onChange={(v) => setForm(f => ({ ...f, business_type: v }))}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-dim">
              Tags
            </label>
            <TagInput
              tags={form.tags}
              onChange={(tags) => setForm(f => ({ ...f, tags }))}
            />
            <p className="mt-1.5 text-[11px] text-text-dim">Press Enter to add · up to 10 tags</p>
          </div>

          {/* Private Note */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-dim">
              Internal Note
            </label>
            <textarea
              aria-label="Internal note" value={form.private_note}
              onChange={(e) => setForm(f => ({ ...f, private_note: e.target.value }))}
              rows={4}
              placeholder="Private notes only visible to you..."
              className="w-full resize-none rounded-xl border border-border bg-layout-card px-4 py-3 text-[14px] text-text-main outline-none transition-all placeholder:text-text-dim focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl bg-status-danger-bg border border-status-danger-text/25 px-4 py-3">
              <p className="text-[13px] text-status-danger-text">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="h-10 rounded-xl px-5 text-[13px] font-medium text-text-sub hover:bg-layout-page transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-6 text-[13px] font-medium text-on-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </Backdrop>
  )
}
