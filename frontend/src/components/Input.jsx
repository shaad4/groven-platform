import { forwardRef } from 'react'
import { clsx } from 'clsx'

const Input = forwardRef(({ label, error, ...props }, ref) => (
  <div>
    {label && (
      <label className="block text-sm font-medium text-text-sub mb-1.5">
        {label}
      </label>
    )}
    <input
      ref={ref}
      className={clsx(
        'w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-text-main',
        'placeholder:text-text-dim focus:outline-none focus:ring-2 transition-all',
        error
          ? 'border-red-400 focus:ring-red-200'
          : 'border-border focus:ring-primary/30 focus:border-primary'
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
))

Input.displayName = 'Input'
export default Input