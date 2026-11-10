// ─── TAG COLORS ───────────────────────────────────────────────
export const TAG_COLORS = [
  { bg: '#E6F5F0', dot: '#0F6E56', text: '#085041' }, // green
  { bg: '#EEF2FF', dot: '#6366F1', text: '#3730A3' }, // indigo
  { bg: '#FEF3E2', dot: '#F59E0B', text: '#92500A' }, // amber
  { bg: '#FFE4E6', dot: '#F43F5E', text: '#9F1239' }, // rose
  { bg: '#F0F9FF', dot: '#0EA5E9', text: '#0C4A6E' }, // sky
  { bg: '#F5F3FF', dot: '#8B5CF6', text: '#5B21B6' }, // violet
  { bg: '#ECFDF5', dot: '#10B981', text: '#065F46' }, // emerald
  { bg: '#FFF7ED', dot: '#F97316', text: '#9A3412' }, // orange
]

export function getTagColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

// ─── AVATAR COLORS ────────────────────────────────────────────
export const AVATAR_COLORS = [
  { bg: 'bg-[#E6F5F0]', text: 'text-[#085041]' },
  { bg: 'bg-[#EEF2FF]', text: 'text-[#3730A3]' },
  { bg: 'bg-[#FEF3E2]', text: 'text-[#92500A]' },
  { bg: 'bg-[#FFE4E6]', text: 'text-[#9F1239]' },
  { bg: 'bg-[#F0F9FF]', text: 'text-[#0C4A6E]' },
  { bg: 'bg-[#F5F3FF]', text: 'text-[#5B21B6]' },
]

export function getAvatarColor(nameOrIndex) {
  const index = typeof nameOrIndex === 'number'
    ? nameOrIndex
    : Math.abs(nameOrIndex.split('').reduce((h, c) => c.charCodeAt(0) + ((h << 5) - h), 0))
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
}

// ─── BUSINESS TYPES ───────────────────────────────────────────
export const BUSINESS_TYPES = [
  'Agency', 'Freelancer', 'Startup', 'E-commerce', 'Personal Brand',
  'Design Studio', 'Development Studio', 'Marketing Agency', 'Consultancy',
  'Content Creation', 'Video Production', 'Creative Studio', 'SaaS Company',
  'Web Design', 'UI/UX Design', 'Software Development', 'Digital Marketing',
  'Branding', 'Photography', 'Social Media Management', 'Architecture Studio',
  'Interior Design', 'Legal Services', 'Accounting Firm', 'Coaching',
  'Education', 'Other',
]

// ─── TIME FORMATTING ──────────────────────────────────────────
export function timeAgo(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}