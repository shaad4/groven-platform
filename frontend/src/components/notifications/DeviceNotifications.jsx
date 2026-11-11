import { useEffect, useState } from 'react'
import { BellRing, BellOff } from 'lucide-react'
import { supportsPush, enableDeviceNotifications, disableDeviceNotifications, syncDeviceNotifications } from '../../utils/deviceNotifications'

export default function DeviceNotifications() {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { let alive = true; syncDeviceNotifications().then(value => { if (alive) setEnabled(value) }).catch(() => {}); return () => { alive = false } }, [])
  const toggle = async () => {
    setBusy(true); setMessage('')
    try {
      if (enabled) await disableDeviceNotifications()
      else await enableDeviceNotifications()
      setEnabled(!enabled)
    } catch (error) { setMessage(error.response?.data?.detail || error.message || 'Could not update device notifications. Try again.') }
    finally { setBusy(false) }
  }
  return <div className="shrink-0 border-b border-border bg-surface/50 px-4 py-3">
    <button type="button" disabled={busy} onClick={toggle} className="flex min-h-11 w-full items-center gap-3 text-left text-sm font-medium text-text-main disabled:opacity-60">
      {enabled ? <BellRing size={18} /> : <BellOff size={18} />}<span>{busy ? 'Updating notifications…' : enabled ? 'Device notifications on' : 'Enable device notifications'}</span>
    </button>
    <p className="text-xs leading-5 text-text-sub">{enabled ? 'Calls and updates can appear on your lock screen. Tap above to turn off.' : supportsPush() ? 'Get calls and updates even when Groven is closed.' : 'On iPhone, open the installed Home Screen app (iOS 16.4 or later).'}</p>
    {message && <p role="status" className="mt-2 text-xs leading-5 text-status-danger-text">{message}</p>}
  </div>
}
