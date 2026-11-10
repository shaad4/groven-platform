import { ArrowLeft, ArrowRight, Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppearanceMenu from '../components/marketing/AppearanceMenu'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return <div className="flex min-h-screen flex-col bg-layout-page px-5 text-text-main"><div className="flex justify-end py-6"><AppearanceMenu /></div><main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center pb-20 text-center"><span className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-layout-card text-primary-ink"><Compass size={28} strokeWidth={1.5} /></span><p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-dim">Error 404</p><h1 className="mt-4 text-[36px] font-medium leading-tight tracking-[-0.04em]">Page not found</h1><p className="mt-4 text-sm leading-7 text-text-sub">This page may have moved, or the address may be incorrect.</p><div className="mt-8 flex w-full flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={() => navigate(-1)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-layout-card px-5 text-sm font-medium hover:bg-surface"><ArrowLeft size={15} />Go back</button><button type="button" onClick={() => navigate('/')} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-dark">Back to home <ArrowRight size={15} /></button></div></main></div>
}
