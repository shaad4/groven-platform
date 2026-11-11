import { useEffect, useState } from 'react'

// Keep sheets inside the visible area when the mobile keyboard opens.
export default function useVisualViewport() {
  const read = () => ({ height: window.visualViewport?.height || window.innerHeight, top: window.visualViewport?.offsetTop || 0 })
  const [viewport, setViewport] = useState(read)
  useEffect(() => {
    const update = () => setViewport(read())
    const target = window.visualViewport || window
    target.addEventListener('resize', update); target.addEventListener('scroll', update)
    return () => { target.removeEventListener('resize', update); target.removeEventListener('scroll', update) }
  }, [])
  return { height: viewport.height, top: viewport.top, bottom: 'auto' }
}
