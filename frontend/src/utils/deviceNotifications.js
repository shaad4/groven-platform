import api from '../api/client'

export const supportsPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const registration = async () => (await navigator.serviceWorker.getRegistration('/')) || navigator.serviceWorker.register('/sw.js')
const readyRegistration = async () => {
  const worker = await registration()
  if (worker.active) return worker
  return Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Notifications are still preparing. Please try again.')), 10000))])
}
export async function syncDeviceNotifications() {
  if (!supportsPush() || Notification.permission !== 'granted') return false
  const worker = await readyRegistration()
  const subscription = await worker.pushManager.getSubscription()
  if (!subscription) return false
  await api.post('/notifications/push/', subscription.toJSON(), { timeout: 10000 })
  return true
}
export async function enableDeviceNotifications() {
  if (!supportsPush()) throw new Error('On iPhone, add Groven to your Home Screen and open it there to enable notifications.')
  // Must be invoked directly from a click for installed iOS web apps.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser or device notification settings.')
  const { data } = await api.get('/notifications/push/', { timeout: 10000 })
  if (!data.enabled) throw new Error('Device notifications need to be configured by your workspace administrator.')
  const worker = await readyRegistration()
  const padding = '='.repeat((4 - data.public_key.length % 4) % 4)
  const key = Uint8Array.from(atob((data.public_key + padding).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  let subscription = await worker.pushManager.getSubscription()
  if (!subscription) subscription = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  await api.post('/notifications/push/', subscription.toJSON(), { timeout: 10000 })
}
export async function disableDeviceNotifications() {
  if (!supportsPush()) return
  const worker = await navigator.serviceWorker.getRegistration('/')
  const subscription = await worker?.pushManager.getSubscription()
  if (!subscription) return
  // Remove server delivery first, then revoke the browser subscription as well.
  try { await api.delete('/notifications/push/', { data: { endpoint: subscription.endpoint }, timeout: 5000 }) }
  finally { await subscription.unsubscribe() }
}
