import { InlinePending } from '../ui/Skeleton'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { useState, useRef } from 'react'
import {
  X, Mail, ArrowRight, CheckCircle2,
  AlertTriangle, Copy, Plus, ArrowLeft,
} from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

// ─── TAG COLORS ───────────────────────────────────────────────
const TAG_COLORS = [
  { bg: 'var(--review-bg)', dot: 'var(--review-text)', text: 'var(--review-text)' },
  { bg: 'var(--progress-bg)', dot: 'var(--progress-text)', text: 'var(--progress-text)' },
  { bg: 'var(--primary-light)', dot: 'var(--primary-text)', text: 'var(--primary-text)' },
  { bg: 'var(--danger-bg)', dot: 'var(--danger-text)', text: 'var(--danger-text)' },
  { bg: 'var(--success-bg)', dot: 'var(--success-text)', text: 'var(--success-text)' },
]

function getTagColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

// ─── BACKDROP ─────────────────────────────────────────────────
function Backdrop({ children, onClose }) {
  const dialogRef = useDialogFocus(true, onClose)
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-layout-card md:bg-black/70 md:p-4 md:backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  )
}

// ─── FIELD WRAPPER ────────────────────────────────────────────
function Field({ label, optional, hint, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label className="text-[13px] font-medium text-text-main">{label}</label>
        {optional && <span className="text-[12px] text-text-dim">(optional)</span>}
      </div>
      {hint && <p className="mb-2 text-[12px] text-text-dim">{hint}</p>}
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
    if (!name) {
      setInput('')
      return
    }

    const exists = tags.some(
      (t) =>
        t.toLowerCase() ===
        name.toLowerCase()
    )

    if (exists) {
      setInput('')
      return
    }

    if (tags.length >= 10) {
      return
    }

    if (name.length > 30) {
      return
    }
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
      className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2 cursor-text focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all"
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
        placeholder={tags.length === 0 ? 'Type a tag and press Enter' : ''}
        className="min-w-[120px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-dim"
      />
    </div>
  )
}

// ─── BUSINESS TYPE DROPDOWN ───────────────────────────────────
const BUSINESS_TYPES = [
  'Agency',
  'Freelancer',
  'Startup',
  'E-commerce',
  'Personal Brand',
  'Design Studio',
  'Development Studio',
  'Marketing Agency',
  'Consultancy',
  'Content Creation',
  'Video Production',
  'Creative Studio',
  'SaaS Company',
  'Web Design',
  'UI/UX Design',
  'Software Development',
  'Digital Marketing',
  'Branding',
  'Photography',
  'Social Media Management',
  'Architecture Studio',
  'Interior Design',
  'Legal Services',
  'Accounting Firm',
  'Coaching',
  'Education',
  'Other',
]

function BusinessTypeSelect({ value, onChange }) {
  return (
    <select aria-label="Business type" value={value} onChange={event => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-layout-card px-3 text-base text-text-main outline-none transition-colors focus:border-primary sm:text-sm">
      <option value="">Select business type</option>
      {BUSINESS_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
    </select>
  )
}

// ─── MAIN MODAL ───────────────────────────────────────────────
export default function AddClientModal({ onClose, onSuccess }) {
  const { tenant } = useAuth()

  const [step, setStep]       = useState('form')
  const [loading, setLoading] = useState(false)
  const [errorState, setError] = useState({ type: '', message: '' })
  const [successData, setSuccess] = useState(null)

  const [form, setForm] = useState({
    client_name:   '',
    client_email:  '',
    business_type: '',
    private_note:  '',
    tags:          [],
  })
  const [fieldErrors, setFieldErrors] = useState({})


// ─── VALIDATION ─────────────────────────────────────────────

const set = (k) => (e) => {
  const value = e.target.value

  setForm((f) => ({
    ...f,
    [k]: value,
  }))

  setFieldErrors((prev) => {
    const next = { ...prev }

    // ─── Name validation ─────────────────────
    if (k === 'client_name') {
      const trimmed = value.trim()

      if (!trimmed) {
        next.client_name =
          'Client name is required.'
      } else if (trimmed.length < 2) {
        next.client_name =
          'Name must be at least 2 characters.'
      } else if (trimmed.length > 120) {
        next.client_name =
          'Name cannot exceed 120 characters.'
      } else {
        delete next.client_name
      }
    }

    // ─── Email validation ────────────────────
    if (k === 'client_email') {
      const trimmed = value
        .trim()
        .toLowerCase()

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!trimmed) {
        next.client_email =
          'Email address is required.'
      } else if (
        !emailRegex.test(trimmed)
      ) {
        next.client_email =
          'Enter a valid email address.'
      } else if (
        trimmed.length > 255
      ) {
        next.client_email =
          'Email address is too long.'
      } else {
        delete next.client_email
      }
    }

    // ─── Note validation ─────────────────────
    if (k === 'private_note') {
      if (value.length > 2000) {
        next.private_note =
          'Internal note cannot exceed 2000 characters.'
      } else {
        delete next.private_note
      }
    }

    return next
  })
}

const validate = () => {
  const errs = {}

  const name =
    form.client_name.trim()

  const email = form.client_email
    .trim()
    .toLowerCase()

  const note =
    form.private_note.trim()

  // ─── Name ─────────────────────────────────

  if (!name) {
    errs.client_name =
      'Client name is required.'
  } else if (name.length < 2) {
    errs.client_name =
      'Name must be at least 2 characters.'
  } else if (name.length > 120) {
    errs.client_name =
      'Name cannot exceed 120 characters.'
  }

  // ─── Email ────────────────────────────────

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!email) {
    errs.client_email =
      'Email address is required.'
  } else if (
    !emailRegex.test(email)
  ) {
    errs.client_email =
      'Enter a valid email address.'
  } else if (
    email.length > 255
  ) {
    errs.client_email =
      'Email address is too long.'
  }

  // ─── Tags ─────────────────────────────────

  if (form.tags.length > 10) {
    errs.tags =
      'Maximum 10 tags allowed.'
  }

  const duplicateTags =
    new Set(
      form.tags.map((t) =>
        t.toLowerCase()
      )
    )

  if (
    duplicateTags.size !==
    form.tags.length
  ) {
    errs.tags =
      'Duplicate tags are not allowed.'
  }

  const oversizedTag =
    form.tags.find(
      (tag) =>
        tag.length > 30
    )

  if (oversizedTag) {
    errs.tags =
      'Each tag must be under 30 characters.'
  }

  // ─── Internal note ───────────────────────

  if (note.length > 2000) {
    errs.private_note =
      'Internal note cannot exceed 2000 characters.'
  }

  setFieldErrors(errs)

  return (
    Object.keys(errs).length ===
    0
  )
}



  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await api.post('/clients/', {
        client_name:   form.client_name.trim(),
        client_email:  form.client_email.trim(),
        business_type: form.business_type || undefined,
        private_note:  form.private_note.trim() || undefined,
        tags:          form.tags.length ? form.tags : undefined,
      })
      setSuccess(res.data.data)
      setStep('success')
      onSuccess?.()
    } catch (err) {
      const error_type = err?.response?.data?.error_type || 'generic'
      const message    = err?.response?.data?.message    || 'Something went wrong. Please try again.'
      setError({ type: error_type, message })
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const resetToForm = () => {
    setStep('form')
    setForm({ client_name: '', client_email: '', business_type: '', private_note: '', tags: [] })
    setFieldErrors({})
    setError({ type: '', message: '' })
    setSuccess(null)
  }

  // ── FORM ──────────────────────────────────────────────────
  if (step === 'form') return (
    <Backdrop key={`${step}-${errorState.type}`} onClose={onClose}>
      <div className="w-full h-full md:h-auto md:max-h-[95dvh] md:max-w-[980px] overflow-hidden border-none md:border md:border-border bg-layout-card shadow-none md:shadow-[0px_24px_60px_rgba(10,46,36,0.16)]
        rounded-none md:rounded-[24px] lg:rounded-[28px] flex flex-col">

        {/* MOBILE HEADER */}
        <div className="flex h-14 items-center justify-between border-b border-border bg-layout-card px-4 md:hidden shrink-0">
          <button
            type="button"
            onClick={onClose} aria-label="Close dialog"
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-layout-page transition-colors"
          >
            <ArrowLeft size={20} className="text-text-sub" />
          </button>
          <span className="text-[16px] font-semibold text-text-main">Add Client</span>
          <div className="w-10" />
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[360px_1fr] flex-1 overflow-hidden">

          {/* LEFT PANEL */}
          <div className="hidden lg:flex relative overflow-hidden border-r bg-layout-page p-8 flex-col justify-between overflow-y-auto h-full shrink-0">


            <div className="relative z-10 flex h-full flex-col">

              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-layout-card px-3 py-1 text-[11px] font-medium text-primary-ink">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  CLIENT PORTAL
                </div>

                <h2 className="text-[28px] font-semibold leading-tight text-text-main">
                  Add a new client
                </h2>

                <p className="mt-3 max-w-[260px] text-[14px] leading-6 text-text-sub">
                  Create a private workspace and instantly send a secure invitation.
                </p>
              </div>

              {/* Preview Card */}
              <div className="mt-10 rounded-2xl border border-border bg-layout-card p-5 shadow-sm">

                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light">
                    <Mail size={18} className="text-primary-ink" />
                  </div>

                  <div>
                    <p className="text-[14px] font-medium text-text-main">
                      {form.client_name || 'Your client'}
                    </p>

                    <p className="mt-1 text-[12px] leading-5 text-text-sub">
                      will receive an invite to access their portal workspace.
                    </p>
                  </div>
                </div>

                <div className="my-5 h-px bg-surface" />

                <div className="rounded-xl bg-layout-page px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-text-dim">
                    Workspace URL
                  </p>

                  <p className="mt-1 break-all text-[13px] font-medium text-primary-ink">
                    {tenant?.slug}.groven.in/portal
                  </p>
                </div>

                {form.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {form.tags.map((tag) => {
                      const c = getTagColor(tag)
                      return (
                        <span
                          key={tag}
                          className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                          style={{
                            background: c.bg,
                            color: c.text,
                          }}
                        >
                          {tag}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-border">
                <p className="text-[12px] leading-5 text-text-dim">
                  Clients can submit requests, review deliveries, and keep conversations in one place.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 pb-24 md:pb-10 h-full">

            <div className="grid gap-6">

              {/* Mobile Title & Subtitle */}
              <div className="mb-2 md:hidden">
                <h2 className="text-[24px] font-bold leading-tight text-text-main">
                  Add a new client
                </h2>
                <p className="mt-2 text-[14px] leading-6 text-text-sub">
                  Create a private workspace and instantly send a secure invitation.
                </p>
                {/* Compact Workspace URL */}
                <div className="mt-4 rounded-xl bg-layout-page border border-border p-3 text-[12px]">
                  <span className="font-medium text-text-dim uppercase tracking-wider text-[11px]">
                    Workspace URL
                  </span>
                  <p className="mt-0.5 break-all font-medium text-primary-ink">
                    {tenant?.slug}.groven.in/portal
                  </p>
                </div>
              </div>

              {/* ROW 1 */}
              <div className="grid gap-5 md:grid-cols-2">

                <Field label="Client name">
                  <input
                    type="text"
                    aria-label="Client name" aria-invalid={Boolean(fieldErrors.client_name)} autoComplete="name"
                    value={form.client_name}
                    onChange={set('client_name')}
                    placeholder="Meera Enterprises"
                    className={`h-12 w-full rounded-2xl border bg-layout-card px-4 text-[14px] outline-none transition-all ${
                      fieldErrors.client_name
                        ? 'border-status-danger-text/25 ring-4 ring-status-danger-text/15'
                        : 'border-border focus:border-primary focus:ring-4 focus:ring-primary/10'
                    }`}
                  />
                  {fieldErrors.client_name && (
                    <p className="mt-1.5 text-[12px] text-status-danger-text">
                      {fieldErrors.client_name}
                    </p>
                  )}
                </Field>

                <Field label="Email address">
                  <div className="relative">
                    <input
                      type="email"
                      aria-label="Email address" aria-invalid={Boolean(fieldErrors.client_email)} autoComplete="email"
                      value={form.client_email}
                      onChange={set('client_email')}
                      placeholder="meera@example.com"
                      className={`h-12 w-full rounded-2xl border bg-layout-card px-4 pr-10 text-[14px] outline-none transition-all ${
                        fieldErrors.client_email
                          ? 'border-status-danger-text/25 ring-4 ring-status-danger-text/15'
                          : 'border-border focus:border-primary focus:ring-4 focus:ring-primary/10'
                      }`}
                    />

                    {form.client_email && !fieldErrors.client_email && (
                      <CheckCircle2
                        size={16}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-ink"
                      />
                    )}
                  </div>

                  {fieldErrors.client_email && (
                    <p className="mt-1.5 text-[12px] text-status-danger-text">
                      {fieldErrors.client_email}
                    </p>
                  )}
                </Field>
              </div>

              {/* ROW 2 */}
              <div className="grid gap-5 md:grid-cols-2">

                <Field label="Business type" optional>
                  <BusinessTypeSelect
                    value={form.business_type}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, business_type: v }))
                    }
                  />
                </Field>

                <Field
                  label="Tags"
                  optional
                  hint="Press Enter to add tags"
                >
                  <TagInput
                    tags={form.tags}
                    onChange={(tags) =>
                      setForm((f) => ({ ...f, tags }))
                    }
                  />
                </Field>
                {fieldErrors.tags && (
                  <p className="mt-1.5 text-[12px] text-status-danger-text">
                    {fieldErrors.tags}
                  </p>
                )}
              </div>

              {/* NOTE */}
              <Field
                label="Internal note"
                optional
                hint="Only visible to your internal team."
              >
                <textarea
                  aria-label="Internal note" value={form.private_note}
                  onChange={set('private_note')}
                  rows={5}
                  placeholder="Add onboarding details, budget notes, references, or anything useful for your team..."
                  className="w-full resize-none rounded-2xl border border-border bg-layout-card px-4 py-3 text-[14px] outline-none transition-all placeholder:text-text-dim focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                {fieldErrors.private_note && (
                  <p className="mt-1.5 text-[12px] text-status-danger-text">
                    {fieldErrors.private_note}
                  </p>
                )}
              </Field>

              {/* DESKTOP ACTIONS */}
              <div className="hidden md:flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-end">

                <button
                  type="button"
                  onClick={onClose}
                  className="h-12 rounded-2xl px-5 text-[14px] font-medium text-text-sub hover:bg-layout-page transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    loading ||
                    Object.keys(fieldErrors).length > 0
                  }
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-[14px] font-medium text-on-primary transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <><InlinePending label="Sending invitation" /> Sending invite…</>
                  ) : (
                    <>
                      Send invite
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE STICKY BOTTOM ACTIONS */}
        <div className="sticky bottom-0 bg-layout-card border-t border-border p-4 pb-[calc(16px+env(safe-area-inset-bottom))] flex gap-3 z-10 shrink-0 md:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl border border-border text-[14px] font-medium text-text-sub hover:bg-layout-page transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              loading ||
              Object.keys(fieldErrors).length > 0
            }
            className="flex-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-medium text-on-primary transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <><InlinePending label="Sending invitation" /> Sending invite…</>
            ) : (
              <>
                Send invite
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </Backdrop>
  )
  // ── SUCCESS ───────────────────────────────────────────────
  if (step === 'success') return (
    <Backdrop key={`${step}-${errorState.type}`} onClose={onClose}>
      <div className="relative w-full h-full md:h-auto md:max-w-[460px] rounded-none md:rounded-[24px] bg-layout-card p-6 md:p-8 shadow-none md:shadow-[0px_24px_32px_rgba(10,46,36,0.18)] flex flex-col justify-center items-center">
        <button onClick={onClose} aria-label="Close dialog" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-layout-page">
          <X size={16} className="text-text-dim" />
        </button>

        <div className="flex flex-col items-center text-center my-auto md:my-0 w-full">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/25 bg-primary-light">
            <CheckCircle2 size={28} className="text-primary-ink" />
          </div>
          <h2 className="mt-5 text-[22px] font-semibold text-text-main">Invite sent!</h2>
          <p className="mt-3 max-w-[300px] text-[13px] leading-6 text-text-dim">
            An invite has been sent to{' '}
            <span className="font-medium text-text-sub">{successData?.email}</span>.
            Their portal is ready the moment they sign in.
          </p>
          <div className="mt-4 flex items-center gap-2 text-[13px]">
            <span className="text-text-dim">Portal:</span>
            <span className="font-medium text-primary-ink">{tenant?.slug}.groven.in/portal</span>
            <button aria-label="Copy portal link" onClick={() => navigator.clipboard.writeText(`https://${tenant?.slug}.groven.in/portal`)}>
              <Copy size={13} className="text-text-dim hover:text-primary-ink transition-colors" />
            </button>
          </div>
          <div className="my-6 h-px w-full bg-border" />
          <div className="flex w-full gap-3">
            <button
              onClick={resetToForm}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary-light py-3 text-[13px] font-medium text-primary-ink hover:bg-primary-light transition-colors"
            >
              <Plus size={15} /> Add another
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-primary py-3 text-[13px] font-medium text-on-primary hover:bg-primary-dark transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  )

  // ── ERROR SCREENS ─────────────────────────────────────────
  // Duplicate active client
  if (step === 'error' && errorState.type === 'duplicate_client') return (
    <Backdrop key={`${step}-${errorState.type}`} onClose={onClose}>
      <div className="relative w-full h-full md:h-auto md:max-w-[420px] rounded-none md:rounded-[24px] bg-layout-card p-6 md:p-8 shadow-none md:shadow-[0px_24px_32px_rgba(10,46,36,0.18)] flex flex-col justify-center items-center">
        <button onClick={onClose} aria-label="Close dialog" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-layout-page">
          <X size={16} className="text-text-dim" />
        </button>
        <div className="flex flex-col items-center text-center my-auto md:my-0 w-full">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-layout-page">
            <span className="text-2xl">👤</span>
          </div>
          <h2 className="mt-5 text-[20px] font-semibold text-text-main">Already a client</h2>
          <p className="mt-3 max-w-[280px] text-[13px] leading-6 text-text-dim">
            <span className="font-medium text-text-sub">{form.client_email}</span> already has an active portal in your workspace.
          </p>
          <div className="my-6 h-px w-full bg-border" />
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-3 text-[13px] font-medium text-on-primary hover:bg-primary-dark transition-colors"
          >
            Go to clients
          </button>
          <button onClick={resetToForm} className="mt-3 text-[13px] text-text-dim hover:text-text-sub transition-colors">
            Add a different client
          </button>
        </div>
      </div>
    </Backdrop>
  )

  // Pending invite already exists
  if (step === 'error' && errorState.type === 'pending_invite') return (
    <Backdrop key={`${step}-${errorState.type}`} onClose={onClose}>
      <div className="relative w-full h-full md:h-auto md:max-w-[420px] rounded-none md:rounded-[24px] bg-layout-card p-6 md:p-8 shadow-none md:shadow-[0px_24px_32px_rgba(10,46,36,0.18)] flex flex-col justify-center items-center">
        <button onClick={onClose} aria-label="Close dialog" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-layout-page">
          <X size={16} className="text-text-dim" />
        </button>
        <div className="flex flex-col items-center text-center my-auto md:my-0 w-full">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-status-review-text/20 bg-status-review-bg">
            <Mail size={24} className="text-status-review-text" />
          </div>
          <h2 className="mt-5 text-[20px] font-semibold text-text-main">Invite already sent</h2>
          <p className="mt-3 max-w-[280px] text-[13px] leading-6 text-text-dim">
            An invite is pending for{' '}
            <span className="font-medium text-text-sub">{form.client_email}</span>.
            They haven't accepted it yet.
          </p>
          <div className="my-6 h-px w-full bg-border" />
          <div className="flex w-full gap-3">
            <button
              onClick={resetToForm}
              className="flex-1 rounded-xl border border-border bg-layout-page py-3 text-[13px] font-medium text-text-sub hover:bg-surface transition-colors"
            >
              Add different
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-primary py-3 text-[13px] font-medium text-on-primary hover:bg-primary-dark transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  )

  // Plan limit reached
  if (step === 'error' && errorState.type === 'limit_reached') return (
    <Backdrop key={`${step}-${errorState.type}`} onClose={onClose}>
      <div className="relative w-full h-full md:h-auto md:max-w-[420px] rounded-none md:rounded-[24px] bg-layout-card p-6 md:p-8 shadow-none md:shadow-[0px_24px_32px_rgba(10,46,36,0.18)] flex flex-col justify-center items-center">
        <button onClick={onClose} aria-label="Close dialog" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-layout-page">
          <X size={16} className="text-text-dim" />
        </button>
        <div className="flex flex-col items-center text-center my-auto md:my-0 w-full">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-layout-page">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="mt-5 text-[20px] font-semibold text-text-main">Client limit reached</h2>
          <p className="mt-3 max-w-[280px] text-[13px] leading-6 text-text-dim">
            {errorState.message}
          </p>
          <div className="my-6 h-px w-full bg-border" />
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-3 text-[13px] font-medium text-on-primary hover:bg-primary-dark transition-colors"
          >
            Upgrade to Pro
          </button>
          <button onClick={onClose} className="mt-3 text-[13px] text-text-dim hover:text-text-sub transition-colors">
            Maybe later
          </button>
        </div>
      </div>
    </Backdrop>
  )

  // Generic fallback
  return (
    <Backdrop key={`${step}-${errorState.type}`} onClose={onClose}>
      <div className="relative w-full h-full md:h-auto md:max-w-[420px] rounded-none md:rounded-[24px] bg-layout-card p-6 md:p-8 shadow-none md:shadow-[0px_24px_32px_rgba(10,46,36,0.18)] flex flex-col justify-center items-center">
        <button onClick={onClose} aria-label="Close dialog" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-layout-page">
          <X size={16} className="text-text-dim" />
        </button>
        <div className="flex flex-col items-center text-center my-auto md:my-0 w-full">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-status-review-text/20 bg-status-review-bg">
            <AlertTriangle size={24} className="text-status-review-text" />
          </div>
          <h2 className="mt-5 text-[20px] font-semibold text-text-main">Something went wrong</h2>
          <p className="mt-3 max-w-[280px] text-[13px] leading-6 text-text-dim">{errorState.message}</p>
          <div className="my-6 h-px w-full bg-border" />
          <div className="flex w-full gap-3">
            <button
              onClick={resetToForm}
              className="flex-1 rounded-xl bg-primary py-3 text-[13px] font-medium text-on-primary hover:bg-primary-dark transition-colors"
            >
              Try again
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-layout-page py-3 text-[13px] font-medium text-text-sub hover:bg-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  )
}
