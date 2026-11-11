import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ChatPanel from '../../components/chat/ChatPanel'
import ConnectionPill from '../../components/ui/ConnectionPill'
import { PageSkeleton, InlinePending } from '../../components/ui/Skeleton'
import { usePanelResize } from '../../hooks/usePanelResize'
import { useBadges } from '../../hooks/useBadges'
import {
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock3,
  FileText,
  Download,
  Send,
  Paperclip,
  MessageSquare,
  X,
  RotateCcw,
  Pencil,
  ExternalLink,
  Video,
} from 'lucide-react'

import ClientLayout from '../../components/layout/ClientLayout'
import requestsApi from '../../api/requests.api'
import { timeAgo, formatDate } from '../../utils/clientHelpers'
import { useTenantBranding } from '../../context/TenantBrandingContext'

import { useWebRTC } from '../../hooks/useWebRTC'
import VideoCall from '../../components/chat/VideoCall'

import usePortalDialog from '../../components/client/usePortalDialog'
import { RequestStatus } from '../../components/client/RequestSummary'
import { useWalkthrough } from '../../context/WalkthroughContext'
// ─── Status config (Upgraded to Tailwind Tokens) ──────────────────────────────

const STATUS_CONFIG = {
  received:    { label: 'Submitted',   step: 0, pill: 'bg-surface text-text-sub border-border/60', dot: 'bg-text-dim' },
  in_review:   { label: 'In review',   step: 1, pill: 'bg-status-review-bg text-status-review-text border-status-review-text/20', dot: 'bg-amber-500' },
  in_progress: { label: 'In progress', step: 2, pill: 'bg-status-progress-bg text-status-progress-text border-status-progress-text/20', dot: 'bg-indigo-500' },
  delivered:   { label: 'Ready for review', step: 3, pill: 'bg-primary-light text-primary-ink border-primary/20', dot: 'bg-primary' },
  closed:      { label: 'Completed',   step: 4, pill: 'bg-surface/50 text-text-dim border-border/40', dot: 'bg-border' },
}

const STATUS_STEPS = ['received', 'in_review', 'in_progress', 'delivered', 'closed']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function getDueDateText(date) {
  if (!date) return null
  const today = new Date()
  const due   = new Date(date)
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  if (diff < 0)  return `Overdue by ${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''}`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `Due in ${diff} days`
}

// ─── Delivery Review Modal ────────────────────────────────────────────────────

function DeliveryReviewModal({ delivery, onClose, onSubmit, loading, error }) {
  const { colors } = useTenantBranding()
  const { accent, accentSoft, accentDark } = colors
  const [step, setStep] = useState('choice')
  const [reworkMessage, setReworkMessage] = useState('')
  const [hoveredApprove, setHoveredApprove] = useState(false)
  const [hoveredSubmit, setHoveredSubmit] = useState(false)
  const [focusedTextarea, setFocusedTextarea] = useState(false)
  const dialogRef = usePortalDialog(true, () => { if (!loading) onClose() })

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-0 sm:px-4">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-sidebar/30 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onClose()}
      />

      {/* Sheet / Modal */}
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="delivery-review-heading" className="relative max-h-[90dvh] overflow-y-auto w-full sm:max-w-md bg-layout-card sm:rounded-2xl rounded-t-3xl shadow-soft animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-8 duration-300">

        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-border/60" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h2 id="delivery-review-heading" className="text-base font-semibold text-text-main tracking-tight">
              {step === 'choice' ? 'Review Delivery' : 'Request Rework'}
            </h2>
            <p className="text-xs text-text-dim mt-0.5 font-medium">
              Update #{delivery.delivery_number}
            </p>
          </div>

          <button
            aria-label="Close delivery review"
            onClick={onClose}
            disabled={loading}
            className="h-8 w-8 rounded-full bg-surface flex items-center justify-center text-text-dim hover:text-text-main hover:bg-border/50 transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && <p role="alert" className="mb-4 rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger-text">{error}</p>}

          {step === 'choice' ? (
            <div className="space-y-3">

              <p className="text-sm text-text-sub leading-relaxed mb-5">
                Happy with the work? Approve to close this request. Need changes? Request a rework and leave a note for your provider.
              </p>

              {/* Approve option */}
              <button
                onClick={() => onSubmit(delivery.id, 'approve', '')}
                disabled={loading}
                aria-busy={loading}
                onMouseEnter={() => setHoveredApprove(true)}
                onMouseLeave={() => setHoveredApprove(false)}
                className="w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-colors disabled:opacity-50 group shadow-sm"
                style={{
                  borderColor: `${accent}40`,
                  backgroundColor: hoveredApprove ? `${accent}20` : `${accent}12`
                }}
              >
                <div
                  className="h-10 w-10 rounded-xl bg-layout-card flex items-center justify-center shrink-0 border shadow-sm"
                  style={{ borderColor: `${accent}20` }}
                >
                  {loading ? (
                    <InlinePending label="Approving delivery" />
                  ) : (
                    <CheckCircle2 size={18} style={{ color: 'var(--primary-text)' }} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--primary-text)' }}>
                    {loading ? 'Approving…' : 'Approve & Close'}
                  </p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--primary-text)' }}>
                    Marks this request as completed
                  </p>
                </div>
              </button>

              {/* Rework option */}
              <button
                onClick={() => setStep('rework')}
                disabled={loading}
                className="w-full flex items-center gap-4 rounded-xl border border-border/60 p-4 text-left hover:bg-surface hover:border-border transition-all disabled:opacity-50"
              >
                <div className="h-10 w-10 rounded-xl bg-surface flex items-center justify-center shrink-0">
                  <RotateCcw size={18} className="text-text-dim" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-main">
                    Request Rework
                  </p>
                  <p className="text-xs text-text-dim mt-0.5">
                    Sends it back with a note for changes
                  </p>
                </div>
              </button>

            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">

              <p className="text-sm text-text-sub leading-relaxed">
                Let your provider know what needs to change. This is optional but helps them get it right the next time.
              </p>

              <textarea
                aria-label="Changes requested"
                value={reworkMessage}
                onChange={e => setReworkMessage(e.target.value)}
                placeholder="e.g. The logo needs to be centered and the font size increased on mobile..."
                rows={4}
                autoFocus
                className="w-full rounded-xl border bg-surface/50 px-4 py-3 text-sm text-text-main placeholder:text-text-dim resize-none transition-all shadow-sm"
                style={{
                  borderColor: focusedTextarea ? accent : 'var(--border)',
                  boxShadow: focusedTextarea ? `0 0 0 2px ${accentSoft}` : '',
                  backgroundColor: focusedTextarea ? 'var(--card)' : ''
                }}
                onFocus={() => setFocusedTextarea(true)}
                onBlur={() => setFocusedTextarea(false)}
              />

              <div className="flex gap-3 pt-2">

                <button
                  onClick={() => setStep('choice')}
                  disabled={loading}
                  className="h-10 px-5 rounded-xl border border-border/60 text-sm font-medium text-text-sub hover:text-text-main hover:bg-surface transition-colors disabled:opacity-50"
                >
                  Back
                </button>

                <button
                  onClick={() => onSubmit(delivery.id, 'rework', reworkMessage)}
                  disabled={loading}
                  aria-busy={loading}
                  onMouseEnter={() => setHoveredSubmit(true)}
                  onMouseLeave={() => setHoveredSubmit(false)}
                  className="flex-1 h-10 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
                  style={{ backgroundColor: hoveredSubmit ? accentDark : accent }}
                >
                  {loading
                    ? <InlinePending label="Sending rework request" />
                    : <RotateCcw size={16} />
                  }
                  {loading ? 'Sending…' : 'Send Rework Request'}
                </button>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientRequestDetailPage() {
  const { colors } = useTenantBranding()
  const { accent, accentSoft, accentDark } = colors
  const { requestId } = useParams()
  const navigate = useNavigate()
  const { startWalkthrough } = useWalkthrough()

  const [req, setReq]               = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showChat, setShowChat]     = useState(false)
  const chatDialogRef = usePortalDialog(showChat, () => setShowChat(false))
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1536 : false
  )

  const [isDesktopLayout, setIsDesktopLayout] = useState(() => window.innerWidth >= 1024)

  useEffect(() => {
    const handleResize = () => { setIsMobile(window.innerWidth < 1536); setIsDesktopLayout(window.innerWidth >= 1024) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!loading && req && localStorage.getItem('grove_walkthrough_client_request_detail') !== 'completed') {
      startWalkthrough('client_request_detail')
    }
  }, [startWalkthrough, loading, req])

  // ── Mobile Navigation State ──
  // 'details' | 'deliveries'
  const [mobileView, setMobileView] = useState('details')
  const initialViewRequest = useRef(null)

  // Review modal
  const [reviewModal, setReviewModal]   = useState(null)  // delivery object | null
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState('')

  // Edit Request
  const [isEditing, setIsEditing]   = useState(false)
  const [editTitle, setEditTitle]   = useState('')
  const [editDesc, setEditDesc]     = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError]   = useState(null)

  const [hoveredBackToReqs, setHoveredBackToReqs] = useState(false)
  const [hoveredEditBtn, setHoveredEditBtn] = useState(false)
  const [hoveredCancelBtn, setHoveredCancelBtn] = useState(false)
  const [hoveredSaveBtn, setHoveredSaveBtn] = useState(false)
  const [focusedEditTitle, setFocusedEditTitle] = useState(false)
  const [focusedEditDesc, setFocusedEditDesc] = useState(false)
  const [hoveredReviewBtn, setHoveredReviewBtn] = useState(false)


  const { width: sidebarWidth, onMouseDown: startSidebarResize } = usePanelResize({
    storageKey: 'client-request-sidebar-width',
    initialWidth: 300,
    minWidth: 260,
    maxWidth: 380,
    direction: 'left',
  })

  const { width: chatWidth, onMouseDown: startChatResize } = usePanelResize({
    storageKey: 'client-request-chat-width',
    initialWidth: 320,
    minWidth: 280,
    maxWidth: 460,
    direction: 'right',
  })

  const { registerPortalListener } = useBadges()

  const chatWsRef = useRef(null)

  const sendSignal = useCallback((payload) => {

    if (chatWsRef.current?.readyState === WebSocket.OPEN){
      chatWsRef.current.send(JSON.stringify(payload))
    }

  }, [])

  const {
    callState, localStream, remoteStream,
    isMuted, isCamOff,
    startCall, acceptCall, declineCall, hangUp,
    handleSignal, toggleMute, toggleCam,
  } = useWebRTC({ sendSignal })

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [reqRes, delRes] = await Promise.all([
        requestsApi.get(requestId),
        requestsApi.getDeliveries(requestId),
      ])
      setReq(reqRes.data.data)
      setDeliveries(delRes.data.data || [])
      if (initialViewRequest.current !== requestId) {
        initialViewRequest.current = requestId
        setMobileView(reqRes.data.data?.status === 'delivered' ? 'deliveries' : 'details')
      }
    } catch {
      // safe fallback
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleEditSave = async () => {
    setEditLoading(true)
    setEditError(null)
    try {
      await requestsApi.update(requestId, {
        title: editTitle,
        description: editDesc,
      })
      await fetchAll()
      setIsEditing(false)
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Failed to save changes.')
    } finally {
      setEditLoading(false)
    }
  }

  useEffect(() => {
    return registerPortalListener((msg) => {
      if (msg.request_id !== requestId) return

      if (msg.type === 'files_delivered' || msg.type === 'status_change') {
        const newStatus = msg.new_status
        if (newStatus) {
          setReq((prev) =>
            prev ? { ...prev, status: newStatus, updated_at: msg.updated_at || new Date().toISOString() } : prev
          )
        }
        if (msg.type === 'files_delivered') {
          setTimeout(() => fetchAll(), 1500)
        }
      }

      if (msg.type === 'new_message') {
        fetchAll()
      }
    })
  }, [registerPortalListener, requestId, fetchAll])

  const handleReview = async (deliveryId, action, message) => {
    setReviewLoading(true)
    setReviewError('')
    try {
      await requestsApi.reviewDelivery(requestId, deliveryId, action, message)
      await fetchAll()
      setReviewModal(null)
    } catch {
      setReviewError('We couldn’t save your review. Please try again.')
    } finally {
      setReviewLoading(false)
    }
  }

  // ── Loading / not found states ─────────────────────────────────────────────

  if (loading) {
    return (
      <ClientLayout fullBleed>
        <PageSkeleton label="Loading request" variant="detail" className="h-full overflow-y-auto" />
      </ClientLayout>
    )
  }

  if (!req) {
    return (
      <ClientLayout fullBleed>
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
          <div className="h-16 w-16 rounded-2xl bg-surface border border-border/50 flex items-center justify-center mb-5 shadow-sm">
            <AlertCircle size={28} className="text-text-dim" />
          </div>
          <h2 className="text-lg font-semibold text-text-main">Request not found</h2>
          <p className="text-sm text-text-sub mt-1.5 max-w-xs">
            This request may have been removed or is currently unavailable.
          </p>
          <button
            onClick={() => navigate('/my-requests')}
            onMouseEnter={() => setHoveredBackToReqs(true)}
            onMouseLeave={() => setHoveredBackToReqs(false)}
            className="mt-6 h-10 px-5 rounded-xl border border-border/60 bg-layout-card text-sm font-semibold text-text-main shadow-sm transition-colors"
            style={{ backgroundColor: hoveredBackToReqs ? 'var(--surface)' : 'var(--card)' }}
          >
            Back to Requests
          </button>
        </div>
      </ClientLayout>
    )
  }

  const cfg         = STATUS_CONFIG[req.status] || STATUS_CONFIG.received
  const currentStep = cfg.step

  const latestDeliveryNumber = deliveries.length
    ? Math.max(...deliveries.map(d => d.delivery_number))
    : null

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ClientLayout fullBleed>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .attachment-card:hover {
          border-color: ${accent}80 !important;
        }
        .attachment-card:hover .attachment-icon-bg {
          background-color: ${accentSoft} !important;
        }
        .attachment-card:hover .attachment-icon {
          color: var(--primary-text) !important;
        }
        .attachment-card:hover .attachment-title {
          color: var(--primary-text) !important;
        }
        .attachment-download:hover {
          background-color: ${accentSoft} !important;
          color: var(--primary-text) !important;
        }

        .resize-handle:hover {
          background-color: ${accent}0d !important;
        }
        .resize-handle:hover .resize-line {
          background-color: ${accent}33 !important;
        }
        .resize-handle:hover .resize-dot {
          background-color: ${accent}66 !important;
        }

        .review-btn {
          border-color: var(--primary-text) !important;
          color: var(--primary-text) !important;
        }
        .review-btn:hover {
          background-color: var(--primary-text) !important;
          color: #ffffff !important;
        }

        .chat-btn-icon:hover {
          color: var(--primary-text) !important;
          background-color: ${accentSoft} !important;
        }
      `}</style>

      <div className="flex flex-col h-full overflow-hidden bg-layout-page relative">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header className="flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-b border-border bg-layout-card px-4 py-3 lg:min-h-[88px] lg:px-6 lg:py-4">
          <div className="min-w-0 flex-1">
            <button onClick={() => navigate('/my-requests')} className="mb-1 flex items-center gap-1.5 text-xs text-text-sub hover:text-text-main lg:mb-2">My requests<ChevronRight size={12} /><span>#{String(req.id).slice(0, 6)}</span></button>
            <h1 className="break-words text-base font-semibold leading-6 tracking-tight text-text-main sm:text-xl">{req.title}</h1>
          </div>
          <div className="hidden shrink-0 items-center gap-3 sm:flex"><RequestStatus status={req.status} /><button onClick={() => setShowChat(true)} className="hidden min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-xs font-medium text-text-sub lg:flex 2xl:hidden"><MessageSquare size={16} />Discussion</button></div>
        </header>

        {/* ── MOBILE TABS (Details vs Deliveries ONLY) ────────────────────── */}
        <div className="lg:hidden flex px-3 py-1.5 border-b border-border/50 bg-layout-card shrink-0 z-10">
          <div className="flex w-full gap-1">
            <button
              onClick={() => setMobileView('details')}
              className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 px-1 text-xs font-semibold rounded-lg transition-all ${
                mobileView === 'details' ? 'bg-surface text-text-main' : 'text-text-dim hover:text-text-main'
              }`}
            >
              <FileText size={14} />Details
            </button>
            <button
              onClick={() => setMobileView('deliveries')}
              className={`min-h-11 flex-1 px-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mobileView === 'deliveries' ? 'bg-surface text-text-main' : 'text-text-dim hover:text-text-main'
              }`}
            >
              <Download size={14} />Deliveries
              {deliveries.length > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-md text-xs border"
                  style={
                    mobileView === 'deliveries'
                      ? { backgroundColor: accentSoft, color: 'var(--primary-text)', borderColor: `${accent}20` }
                      : { backgroundColor: 'var(--surface)', color: 'var(--text-dim)', borderColor: 'var(--border)' }
                  }
                >
                  {deliveries.length}
                </span>
              )}
            </button>
            <button data-tour={isMobile ? "client-request-chat" : undefined} onClick={() => setShowChat(true)} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-semibold text-text-sub"><MessageSquare size={14} />Chat</button>
          </div>
        </div>

        {/* ── MAIN LAYOUT ─────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden h-full">

          {/* LEFT SIDEBAR (DETAILS) */}
          <div
            style={isDesktopLayout ? { width: `${sidebarWidth}px` } : {}}
            className={`${mobileView === 'details' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-[300px] border-r border-border/50 bg-layout-card overflow-y-auto no-scrollbar shrink-0 h-full`}
          >
            <div className="space-y-6 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:p-6">

              {/* Progress */}
              <div data-tour="client-request-progress">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-text-main">Progress</h2>
                  <span className="text-xs font-semibold" style={{ color: 'var(--primary-text)' }}>{cfg.label}</span>
                </div>

                <div className="space-y-0">
                  {STATUS_STEPS.map((step, index) => {
                    const isDone    = index < currentStep
                    const isCurrent = index === currentStep
                    return (
                      <div key={step} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className="h-5 w-5 rounded-full border flex items-center justify-center transition-colors"
                            style={{
                              backgroundColor: isCurrent || isDone ? accent : 'var(--surface)',
                              borderColor: isCurrent || isDone ? accent : 'var(--border)'
                            }}
                          >
                            {isDone    && <CheckCircle2 size={12} className="text-white" />}
                            {isCurrent && <div className="h-2 w-2 rounded-full bg-white shadow-sm" />}
                          </div>
                          {index < STATUS_STEPS.length - 1 && (
                            <div
                              className="w-0.5 h-8 my-1 rounded-full"
                              style={{ backgroundColor: isDone ? `${accent}4d` : 'var(--border)' }}
                            />
                          )}
                        </div>
                        <div className="pb-4 pt-0.5">
                          <p
                            className="text-sm font-semibold transition-colors"
                            style={{
                              color: isCurrent ? 'var(--primary-text)' : isDone ? 'var(--text-main)' : 'var(--text-dim)'
                            }}
                          >
                            {STATUS_CONFIG[step].label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-text-dim mt-1 font-medium">
                              Updated {timeAgo(req.updated_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="h-px bg-border/40 w-full" />

              {/* Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-text-dim mb-1">
                    <Calendar size={14} />
                    <p className="text-xs font-bold uppercase tracking-wider">Submitted</p>
                  </div>
                  <p className="text-sm font-semibold text-text-main">{formatDate(req.created_at)}</p>
                </div>

                {req.due_date && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-text-dim mb-1">
                      <Clock3 size={14} />
                      <p className="text-xs font-bold uppercase tracking-wider">Due Date</p>
                    </div>
                    <p className="text-sm font-semibold text-text-main">{formatDate(req.due_date)}</p>
                    <p className="text-xs font-bold" style={{ color: 'var(--primary-text)' }}>{getDueDateText(req.due_date)}</p>
                  </div>
                )}
              </div>

              <div className="h-px bg-border/40 w-full" />

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-text-main">Request Details</h2>
                  {req.status === 'received' && !isEditing && (
                    <button
                      onClick={() => {
                        setEditTitle(req.title)
                        setEditDesc(req.description)
                        setIsEditing(true)
                        setEditError(null)
                      }}
                      className="h-7 px-3 rounded-md border border-border/60 flex items-center gap-1.5 text-xs font-semibold text-text-sub transition-colors shadow-sm"
                      onMouseEnter={() => setHoveredEditBtn(true)}
                      onMouseLeave={() => setHoveredEditBtn(false)}
                      style={{ backgroundColor: hoveredEditBtn ? 'var(--surface)' : 'var(--card)' }}
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <label className="text-xs font-semibold text-text-sub mb-1.5 block">Title</label>
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full rounded-xl border bg-surface/30 px-4 py-2.5 text-sm text-text-main focus:outline-none transition-all shadow-sm"
                        style={{
                          borderColor: focusedEditTitle ? accent : 'var(--border)',
                          boxShadow: focusedEditTitle ? `0 0 0 2px ${accentSoft}` : '',
                          backgroundColor: focusedEditTitle ? 'var(--card)' : ''
                        }}
                        onFocus={() => setFocusedEditTitle(true)}
                        onBlur={() => setFocusedEditTitle(false)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-text-sub mb-1.5 block">Description</label>
                      <textarea
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        rows={5}
                        className="w-full rounded-xl border bg-surface/30 px-4 py-3 text-sm text-text-main resize-none focus:outline-none transition-all shadow-sm"
                        style={{
                          borderColor: focusedEditDesc ? accent : 'var(--border)',
                          boxShadow: focusedEditDesc ? `0 0 0 2px ${accentSoft}` : '',
                          backgroundColor: focusedEditDesc ? 'var(--card)' : ''
                        }}
                        onFocus={() => setFocusedEditDesc(true)}
                        onBlur={() => setFocusedEditDesc(false)}
                      />
                    </div>

                    {editError && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                        <AlertCircle size={14} />
                        {editError}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => { setIsEditing(false); setEditError(null) }}
                        disabled={editLoading}
                        onMouseEnter={() => setHoveredCancelBtn(true)}
                        onMouseLeave={() => setHoveredCancelBtn(false)}
                        className="flex-1 h-10 rounded-xl border border-border/60 text-sm font-semibold text-text-sub transition-colors disabled:opacity-50"
                        style={{ backgroundColor: hoveredCancelBtn ? 'var(--surface)' : 'var(--card)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditSave}
                        disabled={editLoading || !editTitle.trim() || !editDesc.trim()}
                        aria-busy={editLoading}
                        onMouseEnter={() => setHoveredSaveBtn(true)}
                        onMouseLeave={() => setHoveredSaveBtn(false)}
                        className="flex-1 h-10 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
                        style={{ backgroundColor: hoveredSaveBtn ? accentDark : accent }}
                      >
                        {editLoading ? <InlinePending label="Saving changes" /> : <CheckCircle2 size={16} />}
                        {editLoading ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-surface/50 border border-border/40 p-4">
                    <p className="text-sm leading-relaxed text-text-sub whitespace-pre-wrap">
                      {req.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-text-main">Attachments</h2>
                  <span className="text-xs font-bold text-text-dim px-2 py-0.5 rounded-md bg-surface border border-border/60">
                    {req.files?.length || 0}
                  </span>
                </div>

                {!req.files?.length ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-surface/30 py-8 text-center flex flex-col items-center">
                    <Paperclip size={20} className="text-text-dim mb-2" />
                    <p className="text-xs font-medium text-text-dim">No attachments provided</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {req.files.map(file => (
                    <a
                      key={file.id}
                      href={file.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="attachment-card group flex items-center gap-3 rounded-xl border border-border/60 px-3 py-3 hover:shadow-soft hover:-translate-y-[1px] bg-layout-card transition-all duration-200"
                    >
                      <div className="attachment-icon-bg h-10 w-10 rounded-lg bg-surface flex items-center justify-center shrink-0 transition-colors">
                        <FileText size={18} className="attachment-icon text-text-dim" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="attachment-title text-sm font-semibold text-text-main truncate transition-colors">{file.file_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-medium text-text-dim">{formatFileSize(file.file_size_bytes)}</span>
                          <span className="text-border">•</span>
                          <span className="text-xs font-bold text-text-dim uppercase tracking-wider">{file.file_extension}</span>
                        </div>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          try {
                            const res = await fetch(file.download_url)
                            const blob = await res.blob()
                            const blobUrl = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = blobUrl
                            a.download = file.file_name
                            a.click()
                            URL.revokeObjectURL(blobUrl)
                          } catch {
                            window.open(file.download_url, '_blank')
                          }
                        }}
                        aria-label={`Download ${file.file_name}`}
                        className="attachment-download shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-text-dim transition-colors"
                      >
                        <Download size={14} />
                      </button>
                    </a>
                  ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Sidebar resize handle (Desktop Only) */}
          <div
            onMouseDown={startSidebarResize}
            className="resize-handle hidden lg:flex w-2 shrink-0 relative cursor-col-resize group items-center justify-center bg-transparent z-10 transition-colors"
          >
            <div className="resize-line absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-transparent transition-colors" />
            <div className="relative z-10 flex flex-col gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="resize-dot w-1 h-1 rounded-full transition-colors" />
              ))}
            </div>
          </div>

          {/* ── CENTER — DELIVERIES ────────────────────────────────────────── */}
          <div className={`${mobileView === 'deliveries' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col overflow-hidden h-full bg-layout-page`}>

            <div className="hidden lg:flex h-[72px] px-8 items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-semibold text-text-main tracking-tight">Deliveries</h2>
                <p className="text-xs font-medium text-text-sub mt-0.5">Files and updates from your provider</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:px-5 2xl:px-8 lg:pb-8">

              {/* ── Pending review banner ──────────────────────────────────── */}
              {req.status === 'delivered' && deliveries.length > 0 && (
                <div
                  className="mb-6 rounded-2xl border border-primary/25 bg-primary-light p-4 lg:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 dark:border-border dark:bg-layout-card"
                >
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div
                      className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-layout-card border shadow-sm flex items-center justify-center shrink-0"
                      style={{ borderColor: `${accent}20` }}
                    >
                      <CheckCircle2 size={20} style={{ color: 'var(--primary-text)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary-ink dark:text-text-main">Your delivery is ready for review</p>
                      <p className="text-xs font-medium mt-0.5 lg:mt-1 text-primary-ink dark:text-text-sub">Approve to close, or request changes.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const latest = deliveries.find(d => d.delivery_number === latestDeliveryNumber)
                      setReviewError('')
                      setReviewModal(latest)
                    }}
                    onMouseEnter={() => setHoveredReviewBtn(true)}
                    onMouseLeave={() => setHoveredReviewBtn(false)}
                    className="w-full lg:w-auto shrink-0 h-10 px-6 rounded-xl text-white text-sm font-semibold shadow-sm hover:shadow-soft active:scale-[0.98] transition-all"
                    style={{ backgroundColor: hoveredReviewBtn ? accentDark : accent }}
                  >
                    Review Delivery
                  </button>
                </div>
              )}

              {deliveries.length === 0 ? (
                <div className="h-full flex items-center justify-center pb-6">
                  <div className="max-w-sm text-center">
                    <div className="h-16 w-16 rounded-2xl bg-layout-card border border-border/60 shadow-sm flex items-center justify-center mx-auto mb-5">
                      <Send size={24} className="text-text-dim" />
                    </div>
                    <h3 className="text-base font-semibold text-text-main">No deliveries yet</h3>
                    <p className="text-sm text-text-sub mt-2 leading-relaxed">
                      When your provider finishes their work, the deliverables will appear right here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-w-3xl">
                  {deliveries.map((delivery, idx) => {
                    const isLatest = delivery.delivery_number === latestDeliveryNumber
                    const isPendingReview = req.status === 'delivered' && isLatest

                    return (
                      <div
                        key={delivery.id}
                        className="rounded-2xl bg-layout-card shadow-sm overflow-hidden border transition-all duration-300 animate-in slide-in-from-bottom-4"
                        style={{
                          animationDelay: `${idx * 100}ms`,
                          borderColor: isPendingReview ? `${accent}66` : 'var(--border)',
                          boxShadow: isPendingReview ? `0 0 0 1px ${accent}1a, var(--tw-shadow)` : ''
                        }}
                      >
                        {/* Card header */}
                        <div className="px-5 lg:px-6 py-4 border-b border-border/50 bg-surface/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-sm font-semibold text-text-main">
                                  Delivery #{delivery.delivery_number}
                                </h3>
                                {isPendingReview ? (
                                  <div className="h-6 px-2.5 rounded-md bg-status-review-bg text-status-review-text border border-status-review-text/20 text-xs font-medium flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    Awaiting review
                                  </div>
                                ) : (
                                  <div className="h-6 px-2.5 rounded-md bg-surface text-text-sub border border-border/60 text-xs font-bold uppercase tracking-wider flex items-center">
                                    Delivered
                                  </div>
                                )}
                              </div>
                              <p className="text-xs font-medium text-text-dim mt-1.5">{timeAgo(delivery.created_at)}</p>
                            </div>

                            {/* Per-card review button */}
                            {isPendingReview && (
                              <button
                                onClick={() => { setReviewError(''); setReviewModal(delivery) }}
                                className="review-btn hidden lg:flex h-9 px-4 rounded-lg border text-xs font-bold transition-all shadow-sm items-center gap-2"
                              >
                                <CheckCircle2 size={14} />
                                Review
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="p-5 lg:p-6">

                          {delivery.message && (
                            <p className="text-sm leading-relaxed text-text-sub whitespace-pre-wrap mb-6 bg-surface/50 rounded-xl p-4 border border-border/40">
                              {delivery.message}
                            </p>
                          )}

                          {!!delivery.links?.length && (
                            <div className="space-y-3 mb-6">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-text-dim mb-2">Links</h4>
                              {delivery.links.map((link, i) => (
                                <a
                                  key={i}
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="attachment-card group flex items-center gap-4 rounded-xl border border-border/60 bg-layout-card px-4 py-3 hover:shadow-soft transition-all"
                                >
                                  <div className="attachment-icon-bg h-10 w-10 rounded-lg bg-surface flex items-center justify-center shrink-0 transition-colors">
                                    <ExternalLink size={18} className="attachment-icon text-text-dim transition-colors" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="attachment-title text-sm font-semibold text-text-main truncate transition-colors">
                                      {link.label || link.url}
                                    </p>
                                    {link.label && (
                                      <p className="text-xs font-medium text-text-dim truncate mt-0.5">{link.url}</p>
                                    )}
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}

                          {!!delivery.files?.length && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-text-dim mb-2">Attached Files</h4>
                              {delivery.files.map(file => (
                              <a
                                key={file.id}
                                href={file.download_url}
                                target="_blank"
                                rel="noreferrer"
                                className="attachment-card group flex items-center gap-4 rounded-xl border border-border/60 bg-layout-card px-4 py-3 hover:shadow-soft transition-all"
                              >
                                <div className="attachment-icon-bg h-10 w-10 rounded-lg bg-surface flex items-center justify-center shrink-0 transition-colors">
                                  <FileText size={18} className="attachment-icon text-text-dim transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="attachment-title text-sm font-semibold text-text-main truncate transition-colors">{file.file_name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs font-medium text-text-dim">{formatFileSize(file.file_size_bytes)}</span>
                                    <span className="text-border">•</span>
                                    <span className="text-xs font-bold uppercase tracking-wider text-text-dim">{file.file_extension}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    try {
                                      const res = await fetch(file.download_url)
                                      const blob = await res.blob()
                                      const blobUrl = URL.createObjectURL(blob)
                                      const a = document.createElement('a')
                                      a.href = blobUrl
                                      a.download = file.file_name
                                      a.click()
                                      URL.revokeObjectURL(blobUrl)
                                    } catch {
                                      window.open(file.download_url, '_blank')
                                    }
                                  }}
                                  aria-label={`Download ${file.file_name}`}
                                  className="attachment-download shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-text-dim transition-colors"
                                >
                                  <Download size={16} />
                                </button>
                              </a>
                            ))}
                            </div>
                          )}

                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          </div>

          {/* Chat resize handle (Desktop Only) */}
          <div
            onMouseDown={startChatResize}
            className="resize-handle hidden 2xl:flex w-2 shrink-0 relative cursor-col-resize group items-center justify-center bg-transparent z-10 transition-colors"
          >
            <div className="resize-line absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-transparent transition-colors" />
            <div className="relative z-10 flex flex-col gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="resize-dot w-1 h-1 rounded-full transition-colors" />
              ))}
            </div>
          </div>

          {/* One persistent chat connection across desktop, sheet, and mobile layouts. */}
          <div
            ref={chatDialogRef}
            tabIndex={isMobile ? -1 : undefined}
            role={isMobile && showChat ? 'dialog' : undefined}
            aria-modal={isMobile && showChat ? true : undefined}
            aria-label="Request discussion"
            data-tour={!isMobile ? 'client-request-chat' : undefined}
            style={!isMobile ? { width: `${chatWidth}px` } : undefined}
            className={isMobile
              ? `${showChat ? 'flex' : 'hidden'} fixed inset-0 z-[60] flex-col bg-layout-card lg:inset-y-4 lg:left-auto lg:right-4 lg:w-[440px] lg:rounded-2xl lg:border lg:border-border lg:shadow-xl`
              : 'flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-layout-card'}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-layout-card px-4 lg:h-[72px] lg:px-5">
              <div><h2 className="text-base font-semibold tracking-tight text-text-main">Discussion</h2><p className="mt-0.5 hidden text-xs text-text-sub sm:block">Messages and updates</p></div>
              <div className="flex items-center gap-2">
                {req?.status !== 'closed' && <button onClick={startCall} className="chat-btn-icon flex h-10 w-10 items-center justify-center rounded-xl text-text-sub" title="Start video call" aria-label="Start video call"><Video size={18} /></button>}
                <ConnectionPill connectionKey={`chat-${requestId}`} />
                {isMobile && <button aria-label="Close discussion" onClick={() => setShowChat(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-text-main"><X size={18} /></button>}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden"><ChatPanel clientName={req?.provider_name || 'Provider'} requestId={requestId} requestStatus={req?.status} activities={[]} wsRef={chatWsRef} onSignal={handleSignal} isClient accent={accent} accentSoft={accentSoft} accentDark={accentDark} /></div>
          </div>
        </div>
      </div>

      {/* ── DELIVERY REVIEW MODAL ─────────────────────────────────────────── */}
      {reviewModal && (
        <DeliveryReviewModal
          delivery={reviewModal}
          loading={reviewLoading}
          error={reviewError}
          onClose={() => { if (!reviewLoading) { setReviewModal(null); setReviewError('') } }}
          onSubmit={handleReview}
        />
      )}

      <VideoCall
        callState={callState}
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        isCamOff={isCamOff}
        clientName={req?.provider_name || 'Provider'}
        onAccept={acceptCall}
        onDecline={declineCall}
        onHangUp={hangUp}
        onToggleMute={toggleMute}
        onToggleCam={toggleCam}
      />

    </ClientLayout>
  )
}
