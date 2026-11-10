import { forwardRef, useId } from 'react'
import { clsx } from 'clsx'

const Input = forwardRef(({ label, error, hint, id, icon: Icon, className, ...props }, ref) => {
  const generatedId = useId()
  const inputId = id || generatedId
  const descriptionId = `${inputId}-description`
  return (
  <div>
    {label && (
      <label htmlFor={inputId} className="mb-2 flex items-center gap-2 text-sm font-medium text-text-sub">
        {Icon && <Icon size={15} aria-hidden="true" />}
        {label}
      </label>
    )}
    <input
      {...props}
      ref={ref}
      id={inputId}
      aria-invalid={error ? true : undefined}
      aria-describedby={[props['aria-describedby'], (error || hint) && descriptionId].filter(Boolean).join(' ') || undefined}
      className={clsx(
        'field-control',
        error
          ? 'border-status-danger-text focus:ring-status-danger-text/20'
          : 'border-border focus:ring-primary/30 focus:border-primary',
        className
      )}
    />
    {(error || hint) && <p id={descriptionId} role={error ? 'alert' : undefined} className={`mt-1.5 text-xs ${error ? 'text-status-danger-text' : 'text-text-dim'}`}>{error || hint}</p>}
  </div>
  )
})

Input.displayName = 'Input'
export default Input
