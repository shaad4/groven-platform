import { useId, useRef, useState } from 'react'
import { ArrowDownToLine, Check, CheckCircle2, FileText, MessageSquare, Paperclip } from 'lucide-react'

const stages = [
  { id: 'request', label: 'Request', number: '01', status: 'In progress' },
  { id: 'review', label: 'Review', number: '02', status: 'Awaiting review' },
  { id: 'delivery', label: 'Delivery', number: '03', status: 'Approved' },
]

function FileRow({ name, type }) {
  return <div className="flex min-w-0 items-center gap-3 border-t border-border py-3"><FileText size={17} className="workflow-file-icon shrink-0" /><span className="min-w-0 flex-1 break-words text-xs font-medium text-text-main">{name}</span><span className="shrink-0 text-[10px] text-text-dim">{type}</span></div>
}

export default function RequestWorkflow() {
  const [activeIndex, setActiveIndex] = useState(0)
  const tabRefs = useRef([])
  const id = useId()
  const active = stages[activeIndex]

  const handleKeyDown = (event, index) => {
    let nextIndex
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % stages.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + stages.length) % stages.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = stages.length - 1
    else return
    event.preventDefault()
    setActiveIndex(nextIndex)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="landing-workflow min-w-0" data-stage={active.id} aria-label="Interactive example of a client request">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-dim"><span>Inside a request</span><span>Interactive example</span></div>
      <div className="landing-workflow-frame overflow-hidden rounded-xl border border-border bg-layout-card">
        <div role="tablist" aria-label="Example request stages" className="grid grid-cols-3 border-b border-border bg-surface/50">
          {stages.map((stage, index) => <button key={stage.id} ref={element => { tabRefs.current[index] = element }} type="button" role="tab" id={`${id}-tab-${stage.id}`} aria-controls={`${id}-panel-${stage.id}`} aria-selected={activeIndex === index} tabIndex={activeIndex === index ? 0 : -1} onClick={() => setActiveIndex(index)} onKeyDown={event => handleKeyDown(event, index)} aria-label={stage.label} className={`workflow-tab relative flex min-h-14 items-center justify-center gap-2 px-2 text-xs transition-colors sm:gap-3 ${activeIndex === index ? 'bg-layout-card font-semibold text-text-main' : 'text-text-sub hover:bg-layout-card/70'}`}><span className="text-[10px] font-normal tabular-nums text-text-dim">{stage.number}</span>{stage.label}{activeIndex === index && <span aria-hidden="true" className="workflow-tab-rule absolute inset-x-4 bottom-0 h-0.5" />}</button>)}
        </div>
        <div className="px-5 pt-6 sm:px-7 sm:pt-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[10px]"><span className="text-text-dim">North Coffee / Campaign design</span><span className={`workflow-status inline-flex items-center gap-1.5 ${activeIndex === 2 ? 'text-primary-ink' : 'text-text-sub'}`}>{activeIndex === 2 ? <Check size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}{active.status}</span></div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-[23px]">Spring launch assets</h2>
          <p className="mt-2 border-b border-border pb-5 text-xs text-text-sub">Requested by Jamie at North Coffee</p>
        </div>
        <div id={`${id}-panel-request`} role="tabpanel" aria-labelledby={`${id}-tab-request`} tabIndex={0} hidden={activeIndex !== 0} className="min-h-[332px] px-5 pb-6 pt-5 sm:min-h-[320px] sm:px-7">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold"><FileText size={14} className="text-text-dim" />The brief</p>
          <p className="max-w-md text-[13px] leading-[1.8] text-text-sub">We’re launching our spring menu. We need a website banner and social assets using the new product photography.</p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[11px]"><span className="text-text-dim">Deliverables <span className="ml-2 text-text-main">Web + social</span></span><span className="text-text-dim">Category <span className="ml-2 text-text-main">Design</span></span></div>
          <div className="mt-6"><p className="mb-2 flex items-center gap-2 text-[11px] font-medium text-text-sub"><Paperclip size={13} />Reference files</p><FileRow name="campaign-brief.pdf" type="PDF" /><FileRow name="product-photography.zip" type="ZIP" /></div>
        </div>
        <div id={`${id}-panel-review`} role="tabpanel" aria-labelledby={`${id}-tab-review`} tabIndex={0} hidden={activeIndex !== 1} className="min-h-[332px] px-5 pb-6 pt-5 sm:min-h-[320px] sm:px-7">
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold"><MessageSquare size={14} className="text-text-dim" />Feedback, with the work</p>
          <div className="space-y-5 border-l border-border pl-4"><div><p className="text-[11px] font-semibold">Alex <span className="ml-2 font-normal text-text-dim">Studio North</span></p><p className="mt-1.5 text-[13px] leading-6 text-text-sub">The first set is ready. We’ve included the website banner and social layouts for your review.</p></div><div><p className="text-[11px] font-semibold">Jamie <span className="ml-2 font-normal text-text-dim">North Coffee</span></p><p className="mt-1.5 text-[13px] leading-6 text-text-sub">The direction looks good. Can we make the menu launch date more prominent?</p></div></div>
          <div className="mt-5"><FileRow name="spring-campaign-review.pdf" type="PDF" /></div>
        </div>
        <div id={`${id}-panel-delivery`} role="tabpanel" aria-labelledby={`${id}-tab-delivery`} tabIndex={0} hidden={activeIndex !== 2} className="min-h-[332px] px-5 pb-6 pt-5 sm:min-h-[320px] sm:px-7">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold"><CheckCircle2 size={15} className="text-primary-ink" />Approved by the client</p>
          <p className="text-[13px] leading-6 text-text-sub">“Looks good, thank you. We’re ready to launch.”</p>
          <p className="mt-2 text-[11px] text-text-dim">Jamie · North Coffee</p>
          <div className="mt-6"><p className="mb-2 flex items-center gap-2 text-[11px] font-medium text-text-sub"><ArrowDownToLine size={13} />Final files</p><FileRow name="website-banner.png" type="PNG" /><FileRow name="social-assets.zip" type="ZIP" /></div>
          <p className="mt-3 text-[11px] leading-5 text-text-dim">The brief, feedback, and final files stay in this request.</p>
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-5 text-text-dim">Example content. Select a stage to follow the request.</p>
    </div>
  )
}
