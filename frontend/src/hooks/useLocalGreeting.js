import { useEffect, useState } from 'react'

export function localGreeting(date = new Date()) {
  const hour = date.getHours()
  return hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? 'Good afternoon' : 'Good evening'
}
export default function useLocalGreeting() {
  const [greeting, setGreeting] = useState(localGreeting)
  useEffect(() => {
    const update = () => setGreeting(localGreeting())
    const timer = setInterval(update, 60000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => { clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update) }
  }, [])
  return greeting
}
