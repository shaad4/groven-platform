import { useState, useRef, useEffect } from 'react'
import { X, ChevronDown, Check, Loader2 } from 'lucide-react'
import clientsApi from '../../api/clients.api'
import { getTagColor, BUSINESS_TYPES } from '../../utils/clientHelpers'

// ─── BACKDROP ─────────────────────────────────────────────────
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
      className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-xl border border-[#e8eae8] px-3 py-2 cursor-text focus-within:border-[#0f6e56] focus-within:ring-4 focus-within:ring-[#0f6e56]/10 transition-all bg-white"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(name => {
        const c = getTagColor(name)
        return (
          <span
            key={name}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
            style={{ background: c.bg, color: c.text }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
            {name}
            <button
              onClick={(e) => { e.stopPropagation(); removeTag(name) }}
              className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </span>
        )
      })}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? 'Add tag...' : ''}
        className="min-w-[100px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#9ea89e]"
      />
    </div>
  )
}

// ─── BUSINESS TYPE DROPDOWN ───────────────────────────────────
function BusinessTypeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-[#e8eae8] bg-white px-4 text-[14px] text-[#141a14] hover:border-[#0f6e56] transition-colors focus:outline-none focus:border-[#0f6e56] focus:ring-4 focus:ring-[#0f6e56]/10"
      >
        <span className={value ? 'text-[#141a14]' : 'text-[#9ea89e]'}>
          {value || 'Select type'}
        </span>
        <ChevronDown size={16} className={`text-[#9ea89e] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-[#e8eae8] bg-white shadow-xl">
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className="w-full px-4 py-2.5 text-left text-[13px] text-[#9ea89e] hover:bg-[#f7f8f7] transition-colors"
          >
            None
          </button>
          {BUSINESS_TYPES.map(type => (
            <button
              key={type}
              onClick={() => { onChange(type); setOpen(false) }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-[#f7f8f7] ${
                value === type ? 'text-[#0f6e56] font-medium bg-[#e6f5f0]' : 'text-[#141a14]'
              }`}
            >
              {type}
              {value === type && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
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
      <div className="w-full max-w-[520px] rounded-[24px] border border-[#e8eae8] bg-white shadow-[0px_24px_60px_rgba(10,46,36,0.14)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f1f3f1] px-6 py-5">
          <div>
            <h2 className="text-[17px] font-semibold text-[#141a14]">Edit details</h2>
            <p className="mt-0.5 text-[12px] text-[#9ea89e]">{displayName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f7f8f7] hover:bg-[#eef0ee] transition-colors"
          >
            <X size={16} className="text-[#7c867d]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">

          {/* Business Type */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]">
              Business Type
            </label>
            <BusinessTypeSelect
              value={form.business_type}
              onChange={(v) => setForm(f => ({ ...f, business_type: v }))}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]">
              Tags
            </label>
            <TagInput
              tags={form.tags}
              onChange={(tags) => setForm(f => ({ ...f, tags }))}
            />
            <p className="mt-1.5 text-[11px] text-[#9ea89e]">Press Enter to add · up to 10 tags</p>
          </div>

          {/* Private Note */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]">
              Internal Note
            </label>
            <textarea
              value={form.private_note}
              onChange={(e) => setForm(f => ({ ...f, private_note: e.target.value }))}
              rows={4}
              placeholder="Private notes only visible to you..."
              className="w-full resize-none rounded-xl border border-[#e8eae8] bg-white px-4 py-3 text-[14px] text-[#141a14] outline-none transition-all placeholder:text-[#9ea89e] focus:border-[#0f6e56] focus:ring-4 focus:ring-[#0f6e56]/10"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#f1f3f1] px-6 py-4">
          <button
            onClick={onClose}
            className="h-10 rounded-xl px-5 text-[13px] font-medium text-[#6b756d] hover:bg-[#f7f8f7] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#0f6e56] px-6 text-[13px] font-medium text-white hover:bg-[#085041] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </Backdrop>
  )
}