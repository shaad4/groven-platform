import './landing.css'

// Original SVG artwork: a team discussing a brief at their studio desk.
export default function StudioIllustration({ className = '' }) {
  return (
    <svg className={`studio-illustration ${className}`} viewBox="0 0 520 238" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <g stroke="var(--studio-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M31 224H493" className="studio-fine-line" />
        <g className="studio-fine-line">
          <path d="M190 24H276V89H190zM233 24V89M190 57H276" />
          <path d="M198 78L210 65L222 78M243 43L250 37L267 48" />
          <path d="M390 38H434M394 38V57H430V38M400 48H423" />
          <path d="M51 87H74M56 87V71H69V87M61 71V62M61 68C53 68 52 63 54 58C61 58 64 63 61 68M62 64C68 64 72 58 70 54C63 56 61 59 62 64" />
        </g>
        <g>
          <path d="M80 135C69 135 68 145 72 157L84 181H131" fill="var(--studio-lilac)" />
          <path d="M88 179L79 224M128 181L140 224M82 207H136" />
          <path d="M101 158L139 157C151 164 158 181 163 209L148 214L130 182L111 187L96 207L80 202L95 168Z" fill="var(--studio-trousers)" />
          <path d="M149 211L162 208L169 218L184 221V225H150ZM80 200L95 207L91 220L102 223V226H72L75 217Z" fill="var(--studio-paper)" />
          <path d="M106 91L126 89C140 98 150 121 149 150L137 166L93 160C83 142 85 108 106 91Z" fill="var(--studio-sage)" />
          <path d="M114 77L112 94C116 101 123 101 128 94L127 79" fill="var(--studio-skin-a)" />
          <path d="M106 49C111 37 135 39 142 53L139 63L145 69L138 73C137 83 131 89 122 86L111 78L106 61Z" fill="var(--studio-skin-a)" />
          <path d="M109 70C101 67 99 58 102 49C106 35 124 31 135 41C144 42 147 49 141 56C132 60 126 54 121 50C125 61 117 64 114 65L114 73Z" fill="var(--studio-hair)" />
          <path d="M109 65C113 61 117 66 114 71M133 62H134M131 79L136 78" />
          <path d="M136 106L149 124L177 132L190 131L196 136L193 142L175 143C154 140 138 136 128 119" fill="var(--studio-skin-a)" />
          <path d="M134 102L143 115L131 124L123 109" fill="var(--studio-sage)" />
          <path d="M98 115L97 138L121 149L135 150L138 156L125 160L112 158L86 144" fill="var(--studio-skin-a)" />
          <path d="M96 109L99 124L86 128" fill="var(--studio-sage)" />
          <path d="M103 147L114 151" />
        </g>
        <g>
          <path d="M120 151H293V160H120Z" fill="var(--studio-desk)" />
          <path d="M132 160L125 224M278 160L286 224M135 184H278" />
          <path d="M161 105H216L230 150H175Z" fill="var(--studio-paper)" />
          <path d="M176 150H244M187 124H199" />
          <path d="M251 135H265V149H251ZM265 138H269C276 138 274 146 265 145" fill="var(--studio-lilac)" />
          <path d="M247 151H274M243 116L255 95M255 95L267 104L252 111Z" fill="var(--studio-desk)" />
          <path d="M243 116L248 136M240 136H255" />
        </g>
        <g>
          <path d="M322 142L356 144L363 181L356 216H342L338 182L332 165L326 185L318 217H303L308 180Z" fill="var(--studio-trousers)" />
          <path d="M304 215H318V224H289V221ZM342 215H356L369 221V225H342Z" fill="var(--studio-paper)" />
          <path d="M330 85C312 88 307 107 309 129L321 150L358 148C366 132 364 105 350 91Z" fill="var(--studio-lilac)" />
          <path d="M334 71L332 88C337 96 345 96 350 89L348 72" fill="var(--studio-skin-b)" />
          <path d="M326 43C334 33 351 37 357 49L354 69C351 79 340 85 333 78L327 70L322 64L325 59Z" fill="var(--studio-skin-b)" />
          <path d="M326 54C319 52 317 43 323 38C323 29 333 26 340 30C348 26 356 31 356 37C367 41 368 52 361 61L355 66L350 54L341 46C335 53 332 55 326 54Z" fill="var(--studio-hair)" />
          <path d="M330 62H331M329 73L335 75M350 61C355 57 358 64 353 67" />
          <path d="M319 101L307 119L290 106L284 108L284 116L305 138C310 142 317 139 322 132L331 116" fill="var(--studio-skin-b)" />
          <path d="M320 97L312 111L327 121L336 105" fill="var(--studio-lilac)" />
          <g className="studio-paper-motion">
            <path d="M270 84L299 80L307 118L277 122Z" fill="var(--studio-paper)" />
            <path d="M279 91L293 89M281 97L297 95M282 103L292 101" className="studio-fine-line" />
          </g>
          <path d="M349 106L344 126L310 126L303 121L296 122L299 132L311 137L346 141C353 140 358 130 360 116" fill="var(--studio-skin-b)" />
          <path d="M348 100L345 116L361 119L363 108" fill="var(--studio-lilac)" />
        </g>
        <g>
          <path d="M414 178H451L445 222H421Z" fill="var(--studio-desk)" />
          <path d="M418 185H447M432 178V139" />
          <g className="studio-leaves">
            <path d="M432 155C414 154 402 143 405 129C420 129 432 140 432 155Z" fill="var(--studio-sage)" />
            <path d="M433 143C429 123 438 108 451 108C456 123 445 138 433 143Z" fill="var(--studio-sage)" />
            <path d="M432 170C442 150 454 146 465 149C462 165 448 173 432 170Z" fill="var(--studio-sage)" />
            <path d="M413 138L430 154M446 117L434 141M456 156L435 168" />
          </g>
        </g>
        <path d="M374 222H399M382 218H403M388 214H409" className="studio-fine-line" />
      </g>
    </svg>
  )
}
