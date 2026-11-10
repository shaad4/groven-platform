import { useState } from 'react'
import { clsx } from 'clsx'

export default function SlugInput({ value, onChange, error }) {
  const [focused, setFocused] = useState(false)

  return (
    <div>
      <label className="block text-sm font-medium text-text-sub mb-1.5">
        Workspace URL
      </label>
      <div className={clsx(
        'flex items-center rounded-lg border bg-white overflow-hidden transition-all',
        focused && !error ? 'border-primary ring-2 ring-primary/20' : 'border-border',
        error && 'border-red-400'
      )}>
        <span className="px-3 py-2.5 bg-surface text-text-dim text-sm border-r border-border select-none">
          groven.in/
        </span>
        <input
          value={value}
          onChange={e => onChange(
            e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
          )}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="your-workspace"
          className="flex-1 px-3 py-2.5 text-sm bg-white focus:outline-none"
        />
      </div>
      {error
        ? <p className="text-xs text-red-500 mt-1">{error}</p>
        : value && (
          <p className="text-xs text-text-dim mt-1">
            Clients visit: <span className="text-primary">groven.in/{value}</span>
          </p>
        )
      }
    </div>
  )
}