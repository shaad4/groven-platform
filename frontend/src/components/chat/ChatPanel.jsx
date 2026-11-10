import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Send, Paperclip, Loader2, CheckCircle2,
  AlertCircle, X, Lock, Download, FileText,
  Image as ImageIcon, File as FileIcon,
  Sparkles,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectAccessToken } from '../../features/auth/authSlice'
import { useWebSocket } from '../../hooks/useWebSocket'
import requestsApi from '../../api/requests.api'
import { getAvatarColor, getInitials } from '../../utils/clientHelpers'
import { wsUrl } from '../../utils/urls'


// ── File type helpers ──────────────────────────────────────────
function getFileIcon(fileType = '', fileName = '') {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (fileType.startsWith('image/')) return { icon: ImageIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' }
  if (fileType === 'application/pdf' || ext === 'pdf') return { icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50' }
  return { icon: FileIcon, color: 'text-amber-600', bg: 'bg-amber-50' }
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

//  Attachment bubble (sent/received) 
function AttachmentBubble({ attachment, isMe, isClient, accent, accentSoft, accentDark }) {
  const { icon: Icon, color, bg } = getFileIcon(
    attachment.file_type,
    attachment.file_name
  )

  const isImage = attachment.file_type?.startsWith('image/')

  if (isImage && attachment.download_url) {
    return (
      <div className="group relative mt-1.5 rounded-xl overflow-hidden border border-slate-200/80 max-w-[220px] shadow-sm transition-all hover:shadow-md">
        <img
          src={attachment.download_url}
          alt={attachment.file_name}
          className="w-full object-cover rounded-xl max-h-[180px]"
        />

        <a
          href={attachment.download_url}
          download={attachment.file_name}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-[2px]"
        >
          <div className="h-9 w-9 rounded-full bg-white/90 shadow flex items-center justify-center">
            <Download size={15} className="text-slate-700" />
          </div>
        </a>
      </div>
    )
  }

  return (
    <a
      href={attachment.download_url}
      download={attachment.file_name}
      target="_blank"
      rel="noreferrer"
      className={`group flex items-center gap-3 mt-1.5 px-3 py-2.5 rounded-xl max-w-[240px] transition-all border shadow-sm
        ${
          isMe
            ? (isClient
                ? 'client-chat-attachment-me'
                : 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-100/70'
              )
            : 'bg-white hover:bg-slate-50 border-slate-100'
        }
      `}
    >
      <div
        className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 ${
          isClient && attachment.file_type?.startsWith('image/') ? 'client-chat-attachment-icon-bg' : bg
        }`}
      >
        <Icon size={16} className={isClient && attachment.file_type?.startsWith('image/') ? 'client-chat-attachment-icon' : color} />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-[12px] font-medium truncate leading-tight
            ${
              isMe 
                ? (isClient ? 'client-chat-attachment-text-me' : 'text-emerald-950')
                : 'text-slate-800'
            }
          `}
        >
          {attachment.file_name}
        </p>

        <p className="text-[11px] mt-0.5 text-slate-400">
          {formatBytes(attachment.file_size_bytes)}
        </p>
      </div>

      <Download
        size={13}
        className="shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
      />
    </a>
  )
}

// ── Pending upload chip ────────────────────────────────────────
function UploadChip({ attachment, onRemove, isClient }) {
  const { icon: Icon, color } = getFileIcon(attachment.file?.type, attachment.file?.name)

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all shadow-sm
      ${attachment.status === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : attachment.status === 'done'
          ? (isClient ? 'client-chat-upload-done border-emerald-200 text-emerald-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')
          : 'border-slate-200 bg-slate-50 text-slate-600'
      }
    `}>
      {attachment.status === 'uploading'
        ? <Loader2 size={12} className={`animate-spin ${isClient ? 'client-chat-upload-loader' : 'text-emerald-600'}`} />
        : attachment.status === 'done'
          ? <CheckCircle2 size={12} className={isClient ? 'client-chat-upload-check' : 'text-emerald-600'} />
          : attachment.status === 'error'
            ? <AlertCircle size={12} />
            : <Icon size={12} className={color} />
      }
      <span className="max-w-[120px] truncate">{attachment.file?.name}</span>
      {attachment.status !== 'uploading' && (
        <button onClick={onRemove} className="ml-1 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={12} />
        </button>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function ChatPanel({
  clientName,
  clientAvatarUrl,
  requestId,
  requestStatus,
  activities = [],
  wsRef,
  onSignal,
  isPro,
  isClient = false,
  accent = '',
  accentSoft = '',
  accentDark = '',
}) {
  const [messages,    setMessages]    = useState([])
  const [input,       setInput]       = useState('')
  const [sending,     setSending]     = useState(false)
  const [attachments, setAttachments] = useState([])
  const messagesEndRef = useRef(null)
  const fileInputRef   = useRef(null)
  const textareaRef    = useRef(null)
  const accessToken    = useSelector(selectAccessToken)
  const currentUser    = useSelector(s => s.auth.user)
  const isClosed       = requestStatus === 'closed'

  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Initial load 
  useEffect(() => {
    requestsApi.getMessages(requestId)
      .then(res => {
        const msgs = res.data.results || []
        setMessages(msgs)
        const hasUnread = msgs.some(
          m => !m.is_read && (m.sender?.id ?? m.sender) !== currentUser?.id
        )
        if (hasUnread) requestsApi.markRead(requestId).catch(() => {})
      })
      .catch(() => {})
  }, [requestId, currentUser?.id])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto resize textarea 
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  // WebSocket 
  const tenant = window.location.hostname.split('.')[0]
  const socketUrl = accessToken
    ? wsUrl(`/ws/chat/${requestId}/?token=${accessToken}&tenant=${tenant}`)
    : null

  const handleWsMessage = useCallback((msg) => {
    if (['call_offer', 'call_answer', 'ice_candidate', 'call_end'].includes(msg.type)){
      onSignal?.(msg)
      return
    }
    if (msg.type === 'message') {
      setMessages(prev => {
        const optIdx = prev.findIndex(
          m =>
            m.optimistic &&
            m.content === msg.content &&
            m.sender === msg.sender_id
        )

        // Replace optimistic message with real message
        if (optIdx !== -1) {
          const next = [...prev]
          const optimistic = prev[optIdx]

          // Cleanup temporary blob URLs
          optimistic.attachments?.forEach(att => {
            if (att.download_url?.startsWith('blob:')) {
              URL.revokeObjectURL(att.download_url)
            }
          })

          next[optIdx] = {
            ...msg,
            sender: msg.sender_id,
            attachments: msg.attachments || [],
          }

          return next
        }

        // Ignore duplicate WS messages
        if (prev.some(m => m.id === msg.id)) {
          return prev
        }

        // Mark incoming messages as read
        if (msg.sender_id !== currentUser?.id) {
          requestsApi.markRead(requestId).catch(() => {})
        }

        // Add new incoming message
        return [
          ...prev,
          {
            ...msg,
            sender: msg.sender_id,
            attachments: msg.attachments || [],
          },
        ]
      })
    }

    if (msg.type === 'read_receipt') {
      setMessages(prev =>
        prev.map(m => {
          const senderId = m.sender?.id ?? m.sender

          return senderId === currentUser?.id
            ? { ...m, is_read: true }
            : m
        })
      )
    }
  }, [currentUser?.id, requestId, onSignal])

  useWebSocket(socketUrl, handleWsMessage, `chat-${requestId}`, wsRef)

  // ── File attachments ─────────────────────────────────────────
  const handleAttachFiles = useCallback(async (fileList) => {
    const incoming = Array.from(fileList).map(f => ({
      file: f, status: 'pending', fileId: null,
    }))
    setAttachments(prev => [...prev, ...incoming])

    for (const entry of incoming) {
      setAttachments(prev =>
        prev.map(a => a.file === entry.file ? { ...a, status: 'uploading' } : a)
      )
      try {
        const result = await requestsApi.uploadFile(requestId, entry.file)
        setAttachments(prev =>
          prev.map(a => a.file === entry.file
            ? { ...a, status: 'done', fileId: result.id }
            : a
          )
        )
      } catch {
        setAttachments(prev =>
          prev.map(a => a.file === entry.file ? { ...a, status: 'error' } : a)
        )
      }
    }
  }, [requestId])

  // AI reply suggestions 
  const fetchSuggestions = async () => {
    setLoadingSuggestions(true)
    setShowSuggestions(true)
    try {
      const res = await requestsApi.suggestReplies(requestId)
      setSuggestions(res.data?.data?.suggestions || [])
    } catch {
      setSuggestions([])
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const applySuggestion = (text) => {
    setInput(text)
    setShowSuggestions(false)
    textareaRef.current?.focus()
  }

  // Send 
  const handleSend = async () => {
    const content         = input.trim()
    const doneAttachments = attachments.filter(a => a.status === 'done')
    if (!content && doneAttachments.length === 0) return
    if (attachments.some(a => a.status === 'uploading')) return

    setInput('')
    setAttachments([])
    setSending(true)

     const optimisticAttachments = doneAttachments.map(a => ({
      id:              a.fileId,
      file_name:       a.file.name,
      file_type:       a.file.type,
      file_size_bytes: a.file.size,
      download_url:    URL.createObjectURL(a.file), 
    }))

    const optimistic = {
      id:          `opt-${Date.now()}`,
      content,
      sender:      currentUser?.id,
      sender_name: currentUser?.display_name || 'You',
      created_at:  new Date().toISOString(),
      is_read:     false,
      optimistic:  true,
      attachments: optimisticAttachments,
    }
    setMessages(prev => [...prev, optimistic])

    try {
      await requestsApi.sendMessage(requestId, {
        content,
        attachment_ids: doneAttachments.map(a => a.fileId),
      })
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Merge messages + activities ──────────────────────────────
  const timeline = useMemo(() => {
    const msgs = messages.map(m => ({ ...m, _type: 'message' }))
    const acts = activities.map(a => ({ ...a, _type: 'activity' }))
    return [...msgs, ...acts].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    )
  }, [messages, activities])

  const groupedTimeline = useMemo(() => {
    return timeline.reduce((acc, item) => {
      const date = new Date(item.created_at).toDateString()
      if (!acc.length || acc[acc.length - 1].date !== date) {
        acc.push({ date, items: [item] })
      } else {
        acc[acc.length - 1].items.push(item)
      }
      return acc
    }, [])
  }, [timeline])

  const formatMsgTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const formatGroupDate = (dateStr) => {
    const d         = new Date(dateStr)
    const today     = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString())     return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const hasUploading = attachments.some(a => a.status === 'uploading')
  const canSend      = (input.trim() || attachments.some(a => a.status === 'done')) && !hasUploading

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-slate-50/60">
      {isClient && (
        <style>{`
          .client-chat-bubble-me {
            background: linear-gradient(135deg, ${accent} 0%, ${accentDark || accent} 100%) !important;
            border-color: ${accent} !important;
            color: #ffffff !important;
          }
          .client-chat-send-btn {
            background: linear-gradient(135deg, ${accent} 0%, ${accentDark || accent} 100%) !important;
            color: #ffffff !important;
          }
          .client-chat-send-btn:hover {
            box-shadow: 0 4px 12px ${accent}33 !important;
          }
          .client-chat-input:focus-within {
            border-color: ${accent}cc !important;
            box-shadow: 0 0 0 4px ${accent}1a !important;
          }
          .client-chat-attachment-me {
            background-color: ${accentSoft}66 !important;
            border-color: ${accent}33 !important;
          }
          .client-chat-attachment-me:hover {
            background-color: ${accentSoft} !important;
            border-color: ${accent}66 !important;
          }
          .client-chat-attachment-text-me {
            color: ${accentDark || accent} !important;
          }
          .client-chat-attachment-icon-bg {
            background-color: ${accentSoft} !important;
          }
          .client-chat-attachment-icon {
            color: ${accent} !important;
          }
          .client-chat-read-receipt {
            color: ${accent} !important;
          }
          .client-chat-upload-loader {
            color: ${accent} !important;
          }
          .client-chat-upload-check {
            color: ${accent} !important;
          }
          .client-chat-upload-done {
            background-color: ${accentSoft} !important;
            border-color: ${accent}33 !important;
            color: ${accentDark || accent} !important;
          }
          .client-chat-empty-icon {
            background-color: ${accentSoft} !important;
            border-color: ${accent}33 !important;
            color: ${accent} !important;
          }
          .client-chat-clip-btn:hover {
            color: ${accent} !important;
            background-color: ${accentSoft} !important;
          }
        `}</style>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-1 min-h-0 custom-scrollbar">
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-sm border
              ${isClient ? 'client-chat-empty-icon' : 'bg-emerald-50 border-emerald-100'}
            `}>
              <Send size={22} className={isClient ? '' : 'text-emerald-600'} />
            </div>
            <div className="space-y-1">
              <p className="text-[15px] font-semibold text-slate-700">No messages yet</p>
              <p className="text-[13px] text-slate-400 max-w-[200px] mx-auto leading-normal">
                Drop a line or attach a file to jumpstart the conversation.
              </p>
            </div>
          </div>
        ) : (
          groupedTimeline.map(group => (
            <div key={group.date}>
              {/* Date divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-slate-200/60" />
                <span className="text-[10px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200/40">
                  {formatGroupDate(group.date)}
                </span>
                <div className="flex-1 h-px bg-slate-200/60" />
              </div>

              <div className="space-y-1">
                {group.items.map((item, idx) => {

                  // Activity pill
                  if (item._type === 'activity') {
                    return (
                      <div key={item.id} className="flex items-center gap-3 py-2.5">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[11px] font-medium px-3 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200/40 max-w-[85%] text-center">
                          {item.description}
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                    )
                  }

                  const isMe     = (item.sender?.id ?? item.sender) === currentUser?.id
                  const prevItem = group.items[idx - 1]
                  const nextItem = group.items[idx + 1]

                  const isFirstInGroup = !prevItem
                    || prevItem._type === 'activity'
                    || (prevItem.sender?.id ?? prevItem.sender) !== (item.sender?.id ?? item.sender)

                  const isLastInGroup = !nextItem
                    || nextItem._type === 'activity'
                    || (nextItem.sender?.id ?? nextItem.sender) !== (nextItem.sender?.id ?? nextItem.sender)

                  const msgAttachments = item.attachments || []
                  const hasContent = item.content && item.content.trim().length > 0

                  return (
                    <div
                      key={item.id}
                      className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}
                        ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}
                      `}
                    >
                      {/* Avatar column */}
                      <div className="w-8 shrink-0 self-end pb-0.5">
                        {isLastInGroup && !isMe && (
                          <div className={`h-8 w-8 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold shadow-sm
                            ${getAvatarColor(clientName).bg} ${getAvatarColor(clientName).text}`}>
                            {clientAvatarUrl ? (
                              <img src={clientAvatarUrl} alt={clientName} className="w-full h-full object-cover" />
                            ) : getInitials(clientName)}
                          </div>
                        )}
                      </div>

                      {/* Bubble column */}
                      <div className={`max-w-[70%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>

                        {/* Sender name — only on first in group */}
                        {isFirstInGroup && (
                          <span className={`text-[11px] font-semibold tracking-wide px-1 text-slate-400 ${isMe ? 'text-right' : 'text-left'}`}>
                            {isMe ? 'You' : clientName}
                          </span>
                        )}

                        {/* Text bubble — only if there's content */}
                        {hasContent && (
                          <div className={`px-4 py-2.5 text-[13.5px] leading-relaxed break-words shadow-sm border
                            ${isMe
                              ? (isClient
                                ? `client-chat-bubble-me rounded-2xl rounded-br-none`
                                : `text-white rounded-2xl rounded-br-none border-emerald-600 bg-gradient-to-br from-emerald-600 to-emerald-700`
                                )
                              : `text-slate-700 bg-white rounded-2xl rounded-bl-none border-slate-100`
                            }
                            ${item.optimistic ? 'opacity-60' : ''}
                          `}>
                            {item.content}
                          </div>
                        )}

                        {/* Attachments */}
                        {msgAttachments.length > 0 && (
                          <div className={`flex flex-col gap-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                            {msgAttachments.map((att, i) => (
                              <AttachmentBubble
                                key={att.id || i}
                                attachment={att.file || att}
                                isMe={isMe}
                                isClient={isClient}
                                accent={accent}
                                accentSoft={accentSoft}
                                accentDark={accentDark}
                              />
                            ))}
                          </div>
                        )}

                        {/* Timestamp + read receipt */}
                        {isLastInGroup && (
                          <div className={`flex items-center gap-1.5 px-1 mt-0.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {formatMsgTime(item.created_at)}
                              {item.optimistic && ' · Sending…'}
                            </span>
                            {isMe && !item.optimistic && (
                              <span className={`text-[11px] font-bold
                                ${item.is_read 
                                  ? (isClient ? 'client-chat-read-receipt' : 'text-emerald-500')
                                  : 'text-slate-300'
                                }
                              `}>
                                {item.is_read ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Locked state */}
      {isClosed ? (
        <div className="shrink-0 border-t px-4 py-4 flex items-center gap-2 justify-center bg-slate-100/80 border-slate-200">
          <Lock size={14} className="text-slate-400" />
          <p className="text-[13px] text-slate-500 font-medium">
            This request is closed — conversation is read-only.
          </p>
        </div>
      ) : (
        <div className="shrink-0 p-4 bg-white border-t border-slate-200/80 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
          
          {/* AI reply suggestions */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
             {isPro && (
                <button
                  onClick={fetchSuggestions}
                  disabled={loadingSuggestions}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-violet-600 hover:text-violet-700 transition-colors disabled:opacity-50"
                >
                  <Sparkles size={12} className={loadingSuggestions ? 'animate-pulse' : ''} />
                  {loadingSuggestions ? 'Thinking of replies…' : showSuggestions ? 'Refresh suggestions' : 'Suggest replies'}
                </button>
              )}
              {showSuggestions && !loadingSuggestions && (
                <button onClick={() => setShowSuggestions(false)} className="text-[11px] text-slate-400 hover:text-slate-600">
                  Hide
                </button>
              )}
            </div>

            {showSuggestions && (
              loadingSuggestions ? (
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-8 w-28 rounded-full bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 bg-[length:200%_100%] animate-shimmer" />
                  ))}
                </div>
              ) : suggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => applySuggestion(s)}
                      title={s}
                      className="text-left max-w-[260px] truncate rounded-full px-3 py-1.5 text-[12px] font-medium text-slate-700 bg-gradient-to-r from-violet-50 to-emerald-50 hover:from-violet-100 hover:to-emerald-100 shadow-sm transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">No suggestions right now — try again in a moment.</p>
              )
            )}
          </div>


          {/* Pending upload chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {attachments.map((a, i) => (
                <UploadChip
                  key={i}
                  attachment={a}
                  isClient={isClient}
                  onRemove={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          {/* Input area */}
          <div className={`rounded-2xl transition-all duration-200 bg-slate-50 border border-slate-200 focus-within:bg-white
            ${isClient 
              ? 'client-chat-input' 
              : 'focus-within:border-emerald-500/80 focus-within:ring-4 focus-within:ring-emerald-500/10'
            }
          `}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${clientName}…`}
              rows={1}
              className="w-full bg-transparent px-4 pt-3.5 pb-1 text-[13.5px] text-slate-700 placeholder-slate-400 outline-none resize-none leading-relaxed"
              style={{
                minHeight: '42px',
                maxHeight: '120px',
              }}
            />
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 transition-all
                  ${isClient ? 'client-chat-clip-btn' : 'hover:text-emerald-600 hover:bg-emerald-50'}
                `}
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => handleAttachFiles(e.target.files)}
              />
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 hidden sm:inline font-medium tracking-wide">
                  ⏎ Send &nbsp;·&nbsp; ⇧⏎ Newline
                </span>
                <button
                  onClick={handleSend}
                  disabled={!canSend || sending}
                  className={`h-8 w-8 flex items-center justify-center rounded-xl transition-all shadow-sm
                    ${canSend && !sending
                      ? `${isClient ? 'client-chat-send-btn' : 'bg-gradient-to-br from-emerald-600 to-emerald-700'} text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none border border-slate-200/50'
                    }
                  `}
                >
                  {sending
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Send size={14} className="ml-0.5" />
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}