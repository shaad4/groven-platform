import { useState, useRef, useMemo } from 'react'
import {
  X,
  Upload,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import requestsApi from '../../api/requests.api'
import { useTenantBranding } from '../../context/TenantBrandingContext'

// ─── CONFIGURATION CONSTANTS ──────────────────────────────────
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_TOTAL_SIZE = 200 * 1024 * 1024 // 200MB
const MAX_FILES = 10

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

// ─── BACKDROP ─────────────────────────────────────────────────
function Backdrop({ children, onClose }) {
  const { colors } = useTenantBranding()
  const { accent, accentDark, accentSoft } = colors
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-sidebar/40 backdrop-blur-sm transition-opacity"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        .new-request-modal-container ::selection {
          background-color: ${accentSoft} !important;
          color: ${accentDark} !important;
        }
        .drag-drop-zone:hover {
          border-color: ${accent}80 !important;
        }
        .drag-drop-zone:hover .upload-icon-container {
          background-color: ${accentSoft} !important;
          color: ${accent} !important;
        }
        .file-item-remove:hover {
          background-color: #FEE2E2 !important;
          color: #EF4444 !important;
        }
        .gradient-btn:hover:not(:disabled) {
          background: ${accentDark} !important;
        }
        .cancel-btn:hover {
          background-color: #FAFBFA !important;
        }
        .input-field:hover:not(:focus) {
          border-color: rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
      {children}
    </div>
  )
}

// ─── FIELD WRAPPER ────────────────────────────────────────────
function Field({ label, optional, hint, children }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <label className="text-sm font-semibold text-text-main">{label}</label>
        {optional && <span className="text-xs text-text-dim font-medium">(optional)</span>}
      </div>
      {hint && <p className="mb-2.5 text-xs text-text-dim">{hint}</p>}
      {children}
    </div>
  )
}

// ─── MAIN MODAL ───────────────────────────────────────────────
export default function NewRequestModal({ providerName, onClose, onSuccess }) {
  const { colors } = useTenantBranding()
  const { accent, accentDark, accentSoft, bg1 } = colors
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [created, setCreated] = useState(null)
  const [errors, setErrors] = useState({})
  const [uploadError, setUploadError] = useState('')
  const [limitReached, setLimitReached] = useState(false)

  const fileInput = useRef(null)

  // ───────────────── Computations ─────────────────
  const totalFileSize = useMemo(() => {
    return files.reduce((sum, file) => sum + file.size, 0)
  }, [files])

  // ───────────────── Validation ─────────────────
  const validateTitle = (value) => {
    if (!value.trim()) return 'Title is required.'
    if (value.trim().length < 3) return 'Title must be at least 3 characters.'
    if (value.trim().length > 500) return 'Title cannot exceed 500 characters.'
    return ''
  }

  const validateDescription = (value) => {
    if (!value.trim()) return 'Description is required.'
    if (value.trim().length < 10) return 'Description must be at least 10 characters.'
    return ''
  }

  const validateForm = () => {
    const nextErrors = {}
    const titleError = validateTitle(title)
    const descriptionError = validateDescription(description)

    if (titleError) nextErrors.title = titleError
    if (descriptionError) nextErrors.description = descriptionError

    if (files.length > MAX_FILES) {
      nextErrors.files = `Maximum ${MAX_FILES} files allowed.`
    }
    if (totalFileSize > MAX_TOTAL_SIZE) {
      nextErrors.files = 'Total upload size exceeds 200MB.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  // ───────────────── File Logic ─────────────────
  const handleFiles = (newFiles) => {
    const incoming = Array.from(newFiles)
    const validFiles = []
    let fileError = ''

    for (const file of incoming) {
      const duplicate = files.some(
        (f) => f.name === file.name && f.size === file.size
      )
      if (duplicate) continue

      if (!ALLOWED_TYPES.includes(file.type)) {
        fileError = `${file.name} has an unsupported file type.`
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        fileError = `${file.name} exceeds the 50MB limit.`
        continue
      }

      validFiles.push(file)
    }

    const updated = [...files, ...validFiles]

    if (updated.length > MAX_FILES) {
      fileError = `Maximum ${MAX_FILES} files allowed.`
    }

    const totalSize = updated.reduce((sum, file) => sum + file.size, 0)
    if (totalSize > MAX_TOTAL_SIZE) {
      fileError = 'Total upload size exceeds 200MB.'
    }

    setErrors((prev) => ({
      ...prev,
      files: fileError,
    }))

    setFiles(updated.slice(0, MAX_FILES))
  }

  const removeFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index)
    setFiles(updatedFiles)
    
    // Re-evaluate file errors upon removal
    const totalSize = updatedFiles.reduce((sum, file) => sum + file.size, 0)
    if (updatedFiles.length <= MAX_FILES && totalSize <= MAX_TOTAL_SIZE) {
      setErrors((prev) => ({ ...prev, files: '' }))
    }
  }

  // ───────────────── Submit Pipeline ─────────────────
  const handleSubmit = async () => {
    setUploadError('')
    setLimitReached(false)
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const res = await requestsApi.create({
        title: title.trim(),
        description: description.trim(),
      })

      const newReq = res.data.data

      for (const file of files) {
        try {
          await requestsApi.uploadFile(newReq.id, file)
        } catch (err) {
          console.error(err)
          setUploadError(`Failed to upload ${file.name}`)
        }
      }

      setCreated(newReq)
    } catch (err) {
      console.error(err)
      if (err?.response?.data?.error_type === 'limit_reached') {
        setLimitReached(true)
      } else {
        setUploadError('Failed to create request.')
      }
    } finally {
      setSubmitting(false)
    }
  }

    //  LIMIT REACHED SCREEN 
  if (limitReached) {
    return (
      <Backdrop onClose={onClose}>
        <div className="relative w-full sm:max-w-[420px] h-[100dvh] sm:h-auto bg-white sm:rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-center animate-in zoom-in-95 duration-200">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-surface hover:bg-border/50 transition-colors"
          >
            <X size={18} className="text-text-dim" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-100 bg-amber-50 mb-6">
              <AlertCircle size={32} className="text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-main tracking-tight">
              Not accepting new requests right now
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-sub max-w-[300px]">
              <span className="font-semibold text-text-main">{providerName}</span> has reached the request limit on their current plan. Please contact them directly, or try again later.
            </p>
            <div className="my-8 h-px w-full bg-border/50" />

            <button
              onClick={onClose}
              className="gradient-btn w-full rounded-xl py-4 text-sm font-semibold text-white active:scale-[0.98] transition-all shadow-sm"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accentDark})` }}
            >
              Close
            </button>
          </div>
        </div>
      </Backdrop>
    )
  }


  // ── SUCCESS SCREEN ─────────────────────────────────────────
  if (created) {
    return (
      <Backdrop onClose={onClose}>
        <div className="relative w-full sm:max-w-[420px] h-[100dvh] sm:h-auto bg-white sm:rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-center animate-in zoom-in-95 duration-200">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-surface hover:bg-border/50 transition-colors"
          >
            <X size={18} className="text-text-dim" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full mb-6"
              style={{ background: accentSoft, border: `4px solid ${accent}40` }}
            >
              <CheckCircle2 size={32} style={{ color: accent }} />
            </div>
            <h2 className="text-2xl font-bold text-text-main tracking-tight">
              Request Sent!
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-sub max-w-[280px]">
              We have received your project details. <span className="font-semibold text-text-main">{providerName}</span> will review it shortly.
            </p>

            <div className="my-8 h-px w-full bg-border/50" />

            <button
              onClick={() => { onSuccess?.(created); onClose() }}
              className="gradient-btn w-full rounded-xl py-4 text-sm font-semibold text-white active:scale-[0.98] transition-all shadow-sm"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accentDark})` }}
            >
              View My Request
            </button>
          </div>
        </div>
      </Backdrop>
    )
  }

  // ── FORM SCREEN ───────────────────────────────────────────
  return (
    <Backdrop onClose={onClose}>
      <div className="new-request-modal-container flex flex-col sm:flex-row w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-4xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300">        
        
        {/* MOBILE HEADER (Only visible on small screens) */}
        <div className="sm:hidden shrink-0 flex items-center justify-between px-5 py-4 border-b border-border/50 bg-white/95 backdrop-blur-md sticky top-0 z-20">
          <span className="text-base font-bold text-text-main tracking-tight">New Request</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-dim hover:text-text-main transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* LEFT PANEL (Desktop Only) */}
        <div className="hidden sm:flex w-[320px] shrink-0 flex-col relative overflow-hidden bg-surface p-8 border-r border-border/50">          
          <div
            className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl"
            style={{ background: accentSoft }}
          />

          <div className="relative z-10 flex h-full flex-col">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-md border border-border/60 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm"
              style={{ color: accent }}
            >
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              New Submission
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-text-main">
              Let's build something.
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-text-sub">
              Tell us exactly what you need — upload references, constraints, and goals. We'll take care of the rest.
            </p>

            {/* Counter/Preview Card */}
            <div className="mt-10 rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
              <div className="rounded-xl bg-surface/50 px-4 py-3 border border-border/40">
                <p className="text-[10px] uppercase font-bold tracking-wider text-text-dim">
                  Routing To
                </p>
                <p className="mt-1 break-all text-sm font-semibold" style={{ color: accent }}>
                  {providerName} Workspace
                </p>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between text-xs text-text-sub">
                  <span className="font-medium">Attached files</span>
                  <span className="font-semibold text-text-main">
                    {files.length} / {MAX_FILES}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-text-sub">
                  <span className="font-medium">Total payload</span>
                  <span className="font-semibold text-text-main">
                    {(totalFileSize / 1024 / 1024).toFixed(1)} <span className="text-text-dim font-medium">/ 200 MB</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <p className="text-xs leading-relaxed text-text-dim font-medium">
                🔒 Safe & Secure. Only {providerName} and your linked account managers can view these files.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (Form Area) */}
        {/* ADDED min-h-0 so the layout correctly constrains children inside max-h boundaries */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white relative">          
          
          {/* Desktop Close Button */}
          <button
            onClick={onClose}
            className="hidden sm:flex absolute right-6 top-6 z-20 h-10 w-10 items-center justify-center rounded-full bg-surface hover:bg-border/50 transition-colors"
          >
            <X size={18} className="text-text-dim hover:text-text-main" />
          </button>

          {/* Scrollable Form Content */}
          {/* ADDED min-h-0 here as well to force the overflow to trigger on this specific div */}
          <div className="flex-1 overflow-y-auto min-h-0 px-5 py-6 sm:px-10 sm:py-10">
            <div className="max-w-2xl mx-auto space-y-8">
              
              {/* Request Title Input */}
              <Field label="What do you need help with?">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setErrors((prev) => ({
                      ...prev,
                      title: validateTitle(e.target.value),
                    }))
                  }}
                  placeholder="e.g. I need a new homepage banner"
                  className={`input-field h-12 w-full rounded-xl border bg-surface/30 px-4 text-sm outline-none transition-all shadow-sm ${
                    errors.title
                      ? 'border-red-300 bg-red-50/30'
                      : 'border-border/60'
                  }`}
                  onFocus={e => {
                    if (!errors.title) {
                      e.target.style.borderColor = accent
                      e.target.style.boxShadow = `0 0 0 4px ${accentSoft}`
                      e.target.style.background = '#fff'
                    }
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = ''
                    e.target.style.boxShadow = ''
                    e.target.style.background = ''
                  }}
                />
                {errors.title && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-red-500">
                    <AlertCircle size={14} />
                    {errors.title}
                  </div>
                )}
              </Field>

              {/* Request Description Input */}
              <Field label="The Details">
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    setErrors((prev) => ({
                      ...prev,
                      description: validateDescription(e.target.value),
                    }))
                  }}
                  rows={6}
                  placeholder="Add parameters, criteria, references, links, or goals..."
                  className={`input-field w-full resize-none rounded-xl border bg-surface/30 px-4 py-3 text-sm outline-none transition-all shadow-sm placeholder:text-text-dim ${
                    errors.description
                      ? 'border-red-300 bg-red-50/30'
                      : 'border-border/60'
                  }`}
                  onFocus={e => {
                    if (!errors.description) {
                      e.target.style.borderColor = accent
                      e.target.style.boxShadow = `0 0 0 4px ${accentSoft}`
                      e.target.style.background = '#fff'
                    }
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = ''
                    e.target.style.boxShadow = ''
                    e.target.style.background = ''
                  }}
                />
                {errors.description && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-red-500">
                    <AlertCircle size={14} />
                    {errors.description}
                  </div>
                )}
              </Field>

              {/* Drag and Drop File Attachments Container */}
              <Field label="Attach Assets" optional hint="Images, videos and PDFs up to 50MB per file">
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    handleFiles(e.dataTransfer.files)
                  }}
                  onClick={() => fileInput.current?.click()}
                  className="drag-drop-zone rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200"
                  style={dragOver ? { borderColor: accent, background: accentSoft, transform: 'scale(0.99)' } : { borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="upload-icon-container h-12 w-12 rounded-full flex items-center justify-center transition-colors"
                      style={dragOver ? { background: accent, color: '#fff' } : { background: 'rgba(0,0,0,0.05)' }}
                    >
                      <Upload size={20} />
                    </div>
                    <p className="text-sm font-semibold text-text-main">
                      Drag files here or <span className="hover:underline" style={{ color: accent }}>browse</span>
                    </p>
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept="image/*,video/mp4,video/webm,video/quicktime,.pdf"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>

                {errors.files && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-red-500">
                    <AlertCircle size={14} />
                    {errors.files}
                  </div>
                )}

                {/* File List Layout */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-xl border border-border/60 bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-text-dim" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-text-main">
                            {file.name}
                          </p>
                          <p className="text-xs font-medium text-text-dim mt-0.5">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(index)
                          }}
                          className="file-item-remove h-8 w-8 rounded-full flex items-center justify-center text-text-dim transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>

              {/* Upload Contextual Alert Notice */}
              {uploadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER ACTIONS ROW (Always sticky at the bottom) */}
          <div className="shrink-0 border-t border-border/50 bg-white px-5 py-4 sm:px-10 sm:py-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end z-20 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn h-12 rounded-xl px-6 text-sm font-semibold text-text-sub transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !description.trim() || !!errors.title || !!errors.description || !!errors.files}
              className="gradient-btn flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-8 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accentDark})` }}
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Submit Request
                  <ArrowRight size={18} className="ml-1" />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </Backdrop>
  )
}