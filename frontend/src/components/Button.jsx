import { clsx } from 'clsx'

export default function Button({ children, loading, className, ...props }) {
  return (
    <button
      className={clsx(
        'w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
        'bg-primary text-white hover:bg-primary-dark',
        'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading
        ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : children
      }
    </button>
  )
}