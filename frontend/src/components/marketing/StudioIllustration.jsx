import { useId } from 'react'
import './landing.css'

function LaptopPerson({ pattern, transform }) {
  return <g transform={transform}>
    <path d="M78 103C53 105 37 115 30 140L22 184C20 200 30 208 48 208H143C162 208 170 198 165 181L151 137C146 117 128 106 106 104Z" fill={`url(#${pattern})`} />
    <path d="M45 147L40 184C39 190 45 195 56 195M142 144L151 183C153 192 145 196 134 196" />
    <path d="M67 45C69 34 99 33 110 47L114 59C122 51 134 56 132 66C131 74 123 78 114 77L113 93L103 100L104 110C97 120 88 119 80 110L80 96C66 96 60 88 61 76L63 57Z" fill="var(--studio-paper)" />
    <path d="M64 51C54 50 49 43 54 36C42 23 57 20 67 25L80 32C83 22 95 24 106 33C116 34 125 42 127 55L115 60C101 42 82 40 64 51Z" fill="var(--studio-hair)" />
    <g stroke="var(--studio-face-ink)">
      <path d="M78 61C73 68 73 76 79 79M92 85C96 90 101 87 101 83M119 65L126 62M71 54L78 53M98 52L103 54" />
      <circle cx="82" cy="61" r="1.6" fill="var(--studio-face-ink)" stroke="none" /><circle cx="103" cy="62" r="1.6" fill="var(--studio-face-ink)" stroke="none" />
    </g>
    <path d="M52 162H128C133 162 136 167 135 172L127 207H62L47 172C45 167 47 162 52 162Z" fill="var(--studio-device)" />
    <path d="M77 166L63 197" stroke="var(--studio-paper)" opacity=".6" />
    <circle cx="94" cy="186" r="3.5" fill="var(--studio-lime)" stroke="var(--studio-face-ink)" strokeWidth="1.6" />
    <path d="M8 209H182" />
  </g>
}

function TabletPerson({ pattern, transform, delivered = false }) {
  return <g transform={transform}>
    <path d="M59 65C50 48 59 26 78 27C88 20 107 26 115 37C127 53 123 69 127 87L134 121L56 129C49 111 48 84 59 65Z" fill="var(--studio-hair)" />
    <path d="M72 106C50 112 42 125 40 148L37 209H148L139 146C136 120 121 111 102 107Z" fill={`url(#${pattern})`} />
    <path d="M62 138L59 190M124 140L134 197M40 173L59 175" />
    <path d="M66 48C82 39 104 41 111 55L113 62C123 58 130 66 123 72L114 74L111 94L100 99L103 113C97 123 85 120 80 111L81 98C68 97 64 88 64 74L63 57Z" fill="var(--studio-paper)" />
    <path d="M61 51C60 39 72 28 85 29C102 27 116 40 118 61L108 60C95 47 79 43 61 51Z" fill="var(--studio-hair)" />
    <g stroke="var(--studio-face-ink)">
      <path d="M78 62C74 70 77 77 82 78M94 84C99 88 103 83 102 80M118 66L121 66M69 55L73 54M93 55L97 57" />
      <circle cx="73" cy="62" r="1.6" fill="var(--studio-face-ink)" stroke="none" /><circle cx="97" cy="63" r="1.6" fill="var(--studio-face-ink)" stroke="none" />
    </g>
    <path d="M113 132H173L164 178H104Z" fill={delivered ? 'var(--studio-paper)' : 'var(--studio-device)'} />
    {delivered ? <><path d="M128 153L136 161L151 144" stroke="var(--studio-lime-ink)" strokeWidth="3" /><path d="M124 169H147" stroke="var(--studio-face-ink)" strokeWidth="1.3" /></> : <path d="M133 136L122 163" stroke="var(--studio-paper)" opacity=".6" />}
    <path d="M132 177L128 162C126 156 121 159 122 164L123 169L118 157C116 153 112 156 114 160L118 172L110 163C105 159 102 163 106 168L117 184C124 193 134 190 137 185L139 173C139 166 134 165 134 170" fill="var(--studio-paper)" />
    <path d="M19 210H183" />
  </g>
}

function Pendant({ x, y, size = 1 }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <path d="M0 -67V0" />
    <g className="studio-lamp-motion"><path d="M-28 28C-27 -8 27 -8 28 28Z" fill="var(--studio-paper)" /><path d="M-24 25C-23 11 -19 6 -12 3" stroke="var(--studio-device)" strokeWidth="5" /><path d="M-8 29C-8 43 8 43 8 29" fill="var(--studio-lime)" /></g>
  </g>
}

function DeskPlant({ transform }) {
  return <g transform={transform}>
    <g className="studio-leaf-motion"><path d="M17 40C-8 20 3 4 14 18L24 36C15 5 29 -10 35 4C39 15 33 31 30 41" fill="var(--studio-lime)" /><path d="M13 22L23 37M29 11L27 31" stroke="var(--studio-lime-ink)" strokeWidth="1.5" /></g>
    <path d="M7 41H38L33 65H13Z" fill="var(--studio-lilac)" /><path d="M5 40H40V46H5Z" fill="var(--studio-lilac)" />
  </g>
}

// Original character family, drawn as editable SVG rather than a raster asset.
export default function StudioIllustration({ scene = 'brief', className = '' }) {
  const id = useId().replace(/:/g, '')
  const dots = `${id}-dots`
  const waves = `${id}-waves`
  const crosses = `${id}-crosses`

  return <svg className={`studio-illustration ${className}`} data-scene={scene} viewBox="0 0 460 250" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <pattern id={dots} width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="var(--studio-paper)" /><circle cx="3.5" cy="3.5" r=".8" fill="var(--studio-face-ink)" /></pattern>
      <pattern id={waves} width="16" height="9" patternUnits="userSpaceOnUse"><rect width="16" height="9" fill="var(--studio-paper)" /><path d="M-8 4Q-4 0 0 4T8 4T16 4T24 4" stroke="var(--studio-face-ink)" strokeWidth=".8" /></pattern>
      <pattern id={crosses} width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="var(--studio-paper)" /><path d="M5 3V7M3 5H7" stroke="var(--studio-face-ink)" strokeWidth=".8" /></pattern>
    </defs>
    <g stroke="var(--studio-outline)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {scene === 'brief' && <>
        <Pendant x={215} y={43} size={.6} /><Pendant x={259} y={70} size={.85} />
        <LaptopPerson pattern={waves} transform="translate(20 27) scale(.95)" />
        <TabletPerson pattern={crosses} transform="translate(260 21) scale(.98)" />
        <DeskPlant transform="translate(212 174) scale(.85)" />
        <path d="M188 227H267M188 111L192 117M196 109L200 115M430 190L434 184M436 194L441 187" />
      </>}
      {scene === 'review' && <>
        <Pendant x={82} y={71} size={.8} />
        <LaptopPerson pattern={dots} transform="translate(112 28)" />
        <g className="studio-note-motion"><path d="M321 78L389 85L381 161L313 153Z" fill="var(--studio-paper)" /><path d="M331 96L373 100M329 107L365 110M327 119L371 123M326 131L348 133" stroke="var(--studio-face-ink)" strokeWidth="1.6" /><path d="M341 76L365 78L364 88L340 86Z" fill="var(--studio-lilac)" /></g>
        <DeskPlant transform="translate(59 176) scale(.9)" />
        <path d="M44 236H322M285 105L289 100M293 110L299 105" />
      </>}
      {scene === 'client' && <>
        <Pendant x={300} y={54} size={.8} />
        <TabletPerson pattern={crosses} transform="translate(115 23)" />
        <path d="M314 169H358L366 231H323Z" fill="var(--studio-device)" /><path d="M310 232H379M330 189H342" />
        <path d="M55 122H87V162H55Z" fill="var(--studio-paper)" /><path d="M62 133H80M62 141H75" stroke="var(--studio-face-ink)" strokeWidth="1.5" /><path d="M62 117H80V126H62Z" fill="var(--studio-lime)" />
        <path d="M92 234H391M95 184L101 188M91 191L97 194" />
      </>}
      {scene === 'delivery' && <>
        <Pendant x={230} y={50} size={.75} />
        <LaptopPerson pattern={dots} transform="translate(22 26) scale(.96)" />
        <TabletPerson pattern={waves} transform="translate(245 22) scale(.98)" delivered />
        <path d="M198 229H263M210 139L219 148L239 126" stroke="var(--studio-lime-ink)" strokeWidth="3" /><path d="M231 108V102M246 115L251 111M213 120L209 115" />
      </>}
    </g>
  </svg>
}
