import { useEffect, useRef } from 'react'
import {
  Phone, PhoneOff, Mic, MicOff,
  Video, VideoOff, PhoneIncoming,
} from 'lucide-react'

function VideoEl({ stream, muted = false, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream
  }, [stream])
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  )
}

export default function VideoCall({
  callState,
  localStream,
  remoteStream,
  isMuted,
  isCamOff,
  clientName,
  onAccept,
  onDecline,
  onHangUp,
  onToggleMute,
  onToggleCam,
}) {
  if (callState === 'idle') return null

  // ── Incoming call modal ───────────────────────────────────
  if (callState === 'incoming') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-72 flex flex-col items-center gap-4 border border-slate-100">
          <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <PhoneIncoming size={24} className="text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-slate-800">{clientName}</p>
            <p className="text-[13px] text-slate-400 mt-0.5">Incoming video call…</p>
          </div>
          <div className="flex gap-4 mt-1">
            <button
              onClick={onDecline}
              className="h-12 w-12 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-100 flex items-center justify-center transition-all"
            >
              <PhoneOff size={20} className="text-rose-600" />
            </button>
            <button
              onClick={onAccept}
              className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-all shadow-md"
            >
              <Phone size={20} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Calling / active overlay ──────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">

      {/* Remote video — full screen */}
      {remoteStream ? (
        <VideoEl
          stream={remoteStream}
          className="absolute inset-0 w-full h-full object-contain bg-slate-900"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="h-20 w-20 rounded-full bg-slate-700 flex items-center justify-center">
            <Phone size={32} className="text-slate-400" />
          </div>
          <p className="text-white text-[15px] font-medium">
            {callState === 'calling' ? `Calling ${clientName}…` : 'Connecting…'}
          </p>
        </div>
      )}

      {/* Local video — PiP corner */}
      {localStream && (
        <div className="absolute top-4 right-4 w-28 h-40 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
          <VideoEl
            stream={localStream}
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        </div>
      )}

      {/* Controls bar */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
        <button
          onClick={onToggleMute}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all border
            ${isMuted
              ? 'bg-rose-500 border-rose-400 text-white'
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={onHangUp}
          className="h-14 w-14 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center shadow-xl transition-all border border-rose-400"
        >
          <PhoneOff size={22} className="text-white" />
        </button>

        <button
          onClick={onToggleCam}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all border
            ${isCamOff
              ? 'bg-rose-500 border-rose-400 text-white'
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
        >
          {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
      </div>
    </div>
  )
}