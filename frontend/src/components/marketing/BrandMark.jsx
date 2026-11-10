import { appUrl } from '../../utils/urls'
import greenLogo from '../../assets/Grove_transparent_logo(Green).png'
import whiteLogo from '../../assets/Grove_transparent_logo(White).png'

export function GrovenLogo({ className = 'h-8' }) {
  return <>
    <img src={greenLogo} alt="Groven" className={`w-auto object-contain dark:hidden ${className}`} />
    <img src={whiteLogo} alt="Groven" className={`hidden w-auto object-contain dark:block ${className}`} />
  </>
}

export default function BrandMark({ className = '' }) {
  return (
    <a href={appUrl(null, '/')} aria-label="Groven home" className={`inline-flex items-center ${className}`}>
      <GrovenLogo />
    </a>
  )
}
