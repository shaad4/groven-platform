export function AdminButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const sizes = {
    sm: 'h-8 px-3 text-[12px] gap-1.5',
    md: 'h-10 px-4 text-[13px] gap-2',
  }

  const variants = {
    primary: 'bg-[#0F6E56] text-white hover:bg-[#0C5B47] disabled:opacity-50',
    danger: 'bg-[#E2483D] text-white hover:bg-[#C73A30] disabled:opacity-50',
    secondary: 'bg-white border border-[#D8DCD8] text-[#2A332E] hover:bg-[#F3F5F3] disabled:opacity-50',
    ghost: 'text-[#5B655C] hover:bg-[#EEF1EE] disabled:opacity-50',
    dangerGhost: 'border border-[#F3D2CE] text-[#C73A30] hover:bg-[#FDF1EF] disabled:opacity-50',
  }

  return (
    <button
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        <>
          {Icon && <Icon size={14} />}
          {children}
        </>
      )}
    </button>
  )
}

const PLAN_STYLES = {
  free: 'bg-[#EEF1EE] text-[#5B655C]',
  pro: 'bg-[#E0F2EC] text-[#0F6E56]',
}

export function PlanBadge({ plan }) {
  const key = (plan || 'free').toLowerCase()
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${PLAN_STYLES[key] || PLAN_STYLES.free}`}>
      {plan || 'Free'}
    </span>
  )
}

const STATUS_STYLES = {
  active: { dot: '#1D9E75', text: '#0F6E56' },
  suspended: { dot: '#E2483D', text: '#C73A30' },
  deactivated: { dot: '#E2483D', text: '#C73A30' },
  pending: { dot: '#D9A33B', text: '#92500A' },
}

export function StatusPill({ status }) {
  const key = (status || '').toLowerCase().replace(/\s+/g, '_')
  const style = STATUS_STYLES[key] || STATUS_STYLES.pending
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: style.text }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: style.dot }} />
      {status}
    </span>
  )
}

export function RoleBadge({ role }) {
  const isProvider = role === 'provider'
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
        isProvider ? 'bg-[#EAF0FF] text-[#3148A3]' : 'bg-[#F1ECFB] text-[#5B3AA3]'
      }`}
    >
      {role}
    </span>
  )
}

// Usage meter — thin bar with numeric label, color escalates near/at limit
export function UsageBar({ used, limit, label }) {
  const unlimited = limit === -1 || limit == null
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const atLimit = !unlimited && used >= limit
  const near = !unlimited && pct >= 80 && !atLimit

  const barColor = atLimit ? '#E2483D' : near ? '#D9A33B' : '#1D9E75'

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="text-[#5B655C]">{label}</span>
        <span className={`font-medium ${atLimit ? 'text-[#C73A30]' : near ? 'text-[#92500A]' : 'text-[#2A332E]'}`}>
          {unlimited ? `${used} / Unlimited` : `${used} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EEF1EE]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      )}
    </div>
  )
}