import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const options = [{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'system', label: 'System', icon: Monitor }]

export default function ThemeToggle({ compact = false, className = '' }) {
  const { theme, setTheme } = useTheme()
  return (
    <div role="group" aria-label="Color theme" className={`inline-flex max-w-full items-center gap-0.5 rounded-xl border border-border bg-layout-card p-1 text-text-sub ${className}`}>
      {options.map(({ value, label, icon: Icon }) => (
        <button key={value} type="button" aria-label={`${label} theme`} title={`${label} theme`} aria-pressed={theme === value} onClick={() => setTheme(value)}
          className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors ${theme === value ? 'bg-surface text-text-main' : 'hover:bg-surface hover:text-text-main'}`}>
          <Icon size={15} aria-hidden="true" />
          {!compact && <span>{label}</span>}
        </button>
      ))}
    </div>
  )
}
