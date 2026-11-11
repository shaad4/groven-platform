import fs from 'node:fs'
import vm from 'node:vm'

function worker() {
  const events = {}, showNotification = jest.fn(async () => {}), openWindow = jest.fn(async () => {})
  const self = { location: { origin: 'https://studio.example.com' }, addEventListener: (name, handler) => { events[name] = handler },
    registration: { showNotification }, clients: { matchAll: jest.fn(async () => []), openWindow } }
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), { self, URL, Date })
  return { events, self, showNotification, openWindow }
}
test('background call push displays a system notification and never stores signaling in it', async () => {
  const { events, showNotification } = worker(); let task
  events.push({ data: { json: () => ({ kind: 'call', title: 'Maya is calling', url: '/requests/123', call_id: '123', expires_at: Date.now() + 60000 }) }, waitUntil: value => { task = value } })
  await task
  expect(showNotification).toHaveBeenCalledWith('Maya is calling', expect.objectContaining({ data: { url: 'https://studio.example.com/requests/123', call_id: '123' }, requireInteraction: true }))
})
test('expired calls are presented as missed calls', async () => {
  const { events, showNotification } = worker(); let task
  events.push({ data: { json: () => ({ kind: 'call', expires_at: 1 }) }, waitUntil: value => { task = value } })
  await task; expect(showNotification.mock.calls[0][0]).toBe('Missed call')
})
test('notification clicks open the request and reject external destinations', async () => {
  const { events, openWindow } = worker(); let task
  const click = url => { events.notificationclick({ notification: { close() {}, data: { url } }, waitUntil: value => { task = value } }); return task }
  await click('/my-requests/123'); expect(openWindow).toHaveBeenCalledWith('https://studio.example.com/my-requests/123')
  await click('https://evil.example/'); expect(openWindow).toHaveBeenCalledTimes(1)
})
