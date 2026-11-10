import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { appUrl } from '../utils/urls'
import {
  Globe,
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
} from 'lucide-react'

import { authApi } from '../api/auth.api'
import { useAuth } from '../context/AuthContext'

import BrandMark from '../components/marketing/BrandMark'
import AppearanceMenu from '../components/marketing/AppearanceMenu'

const schema = z.object({
  business_name: z
    .string()
    .min(2, 'Business name is required')
    .max(50, 'Too long'),

  slug: z
    .string()
    .min(3, 'Minimum 3 characters')
    .max(63, 'Maximum 63 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Only lowercase letters, numbers and hyphens allowed'
    ),
})

export default function WorkspaceSetupPage() {
  const { saveSession } = useAuth()

  const [serverError, setServerError] = useState('')
  const [slugCheck, setSlugCheck] = useState({ slug: '', status: 'idle' })

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const businessName = useWatch({ control, name: 'business_name', defaultValue: '' })
  const slug = useWatch({ control, name: 'slug', defaultValue: '' })

  // auto-generate slug from business name
  useEffect(() => {
    if (!businessName) return

    const generated = businessName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    setValue('slug', generated)
  }, [businessName, setValue])

  const slugStatus = !slug || slug.length < 3 ? 'idle' : slugCheck.slug === slug ? slugCheck.status : 'checking'

  // Ignore an older availability response if the user keeps editing the address.
  useEffect(() => {
    if (!slug || slug.length < 3) return undefined
    let cancelled = false
    const timeout = setTimeout(async () => {
      try {
        const res = await authApi.checkSlug(slug)
        if (!cancelled) setSlugCheck({ slug, status: res.data.available ? 'available' : 'taken' })
      } catch {
        if (!cancelled) setSlugCheck({ slug, status: 'taken' })
      }
    }, 500)
    return () => { cancelled = true; clearTimeout(timeout) }
  }, [slug])

  const workspaceUrl = useMemo(
    () => (slug ? `${slug}.groven.in` : 'your-slug.groven.in'),
    [slug]
  )

  const onSubmit = async (data) => {
    if (isSubmitting) return

    try {
      setServerError('')

      if (slugStatus === 'taken') {
        setServerError('This workspace URL is already taken.')
        return
      }

      const res = await authApi.setupWorkspace(data)
      const payload = res.data.data

      saveSession({
        accessToken: payload.access,
        user: payload.user,
        tenant: payload.tenant,
      })

      window.location.replace(
        appUrl(payload.tenant.slug, '/dashboard')
      )
    } catch (err) {
      const errorData = err.response?.data

      const message =
        errorData?.slug?.[0] ||
        errorData?.error?.message ||
        errorData?.message ||
        'Something went wrong'

      setServerError(message)
    }
  }

  return (
    <div className="min-h-screen bg-layout-page flex flex-col lg:grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_520px]">
      
      {/* ── LEFT CONFIG PANEL ── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:px-16 lg:py-8 max-w-2xl mx-auto w-full z-10">
        
        {/* Header Branding Row */}
        <div className="flex items-center justify-between w-full mb-12 lg:mb-0">
          <BrandMark /><AppearanceMenu />
        </div>

        {/* Form Body Structure */}
        <div className="my-auto py-6 w-full">
          <div className="mb-8">
            <p className="text-xs font-medium text-text-sub">Workspace setup</p>

            <h1 className="mt-4 text-[32px] sm:text-[38px] font-semibold tracking-tight text-text-main leading-tight">
              Create your workspace
            </h1>

            <p className="mt-2.5 text-[14px] leading-6 text-text-sub">
              Choose your workspace name and address. You can add your logo and brand colors in Settings later.
            </p>
          </div>

          {/* Core Response Errors Feedback Banner */}
          {serverError && (
            <div className="mb-6 rounded-xl border border-status-danger-text/20 bg-status-danger-bg/60 p-4 text-[13px] text-status-danger-text flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Field: Business Name */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="workspace-name" className="text-[13px] font-medium text-text-main">
                  Business name
                </label>
              </div>

              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim"
                />
                <input
                  type="text"
                  placeholder="e.g. Acme Studio"
                  id="workspace-name"
                  autoComplete="organization"
                  {...register('business_name')}
                  className={`h-12 w-full rounded-xl border bg-layout-card pl-11 pr-4 text-[14px] text-text-main placeholder:text-text-dim outline-none transition-all ${
                    errors.business_name
                      ? 'border-red-300 focus:ring-red-100 ring-4 ring-red-50/50'
                      : 'border-border focus:border-primary focus:ring-4 focus:ring-primary/10'
                  }`}
                />
              </div>

              {errors.business_name && (
                <p className="mt-1.5 text-[12px] text-status-danger-text flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.business_name.message}
                </p>
              )}
            </div>

            {/* Field: Workspace URL Slug */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="workspace-slug" className="text-[13px] font-medium text-text-main">
                  Workspace URL
                </label>
              </div>

              <div
                className={`flex h-12 items-center gap-2 rounded-xl border bg-layout-card px-4 transition-all focus-within:ring-4 ${
                  errors.slug
                    ? 'border-red-300 focus-within:ring-red-100'
                    : 'border-border focus-within:border-primary focus-within:ring-primary/10'
                }`}
              >
                <Globe size={16} className="text-text-dim shrink-0" />
                
                <input
                  type="text"
                  placeholder="acme-studio"
                  id="workspace-slug"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  {...register('slug')}
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-text-main outline-none placeholder:text-text-dim"
                />

                <span className="text-xs text-text-dim">.groven.in</span>
                {/* Inline Status Indicators */}
                {slugStatus === 'checking' && (
                  <Loader2 size={16} className="animate-spin text-text-dim" />
                )}
                {slugStatus === 'available' && (
                  <CheckCircle2 size={16} className="text-primary-ink" />
                )}
                {slugStatus === 'taken' && (
                  <XCircle className="text-status-danger-text" size={16} />
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                <p className="text-text-dim">
                  Only lowercase letters, numbers, and hyphens are valid.
                </p>
                {slugStatus === 'available' && (
                  <p className="font-medium text-primary-ink">Available</p>
                )}
                {slugStatus === 'taken' && (
                  <p className="font-medium text-status-danger-text">Already taken</p>
                )}
              </div>

              {errors.slug && (
                <p className="mt-1.5 text-[12px] text-status-danger-text flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.slug.message}
                </p>
              )}
            </div>

            {/* Form Execution Submit Trigger */}
            <button
              type="submit"
              disabled={isSubmitting || slugStatus === 'taken' || slugStatus === 'checking'}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-semibold text-on-primary transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating your workspace…
                </>
              ) : (
                <>
                  Launch workspace
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Policy Layout Element */}
        <div className="text-[11px] text-text-dim mt-12 lg:mt-0">
          Your workspace is private. Invite clients when you’re ready.
        </div>
      </div>

      <aside className="hidden min-w-0 flex-col justify-center border-l border-border bg-surface p-9 lg:flex xl:p-14">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-ink">Workspace preview</p>
        <h2 className="mt-4 text-[38px] font-medium leading-tight tracking-[-0.04em] text-text-main">Your client workspace</h2>
        <p className="mb-9 mt-4 text-sm leading-7 text-text-sub">Your business name and address will appear in client invitations.</p>
        <div className="rounded-[22px] border border-border bg-layout-card p-7 shadow-sm">
          <div className="mb-7 flex items-center justify-between gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-medium text-on-primary">{(businessName || 'Y').trim().charAt(0).toUpperCase()}</span><span className="rounded-full bg-primary-light px-2.5 py-1 text-[10px] font-medium text-primary-ink">Your workspace</span></div>
          <p className="break-words text-2xl font-medium tracking-tight text-text-main">{businessName || 'Your studio'}</p><p className="mt-3 flex items-start gap-2 text-xs leading-6 text-text-sub"><Globe size={14} className="mt-1 shrink-0" /><span className="break-all">{workspaceUrl}</span></p>
          <div className="mt-8 space-y-3 border-t border-border pt-6">{['Private client access', 'Requests, files, and conversations together', 'Your business name, logo, and colors'].map(label => <p key={label} className="flex items-start gap-2.5 text-xs leading-5 text-text-sub"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary-ink" />{label}</p>)}</div>
        </div>
        <p className="mt-5 text-center text-[11px] text-text-dim">Your workspace preview updates as you type.</p>
      </aside>
    </div>
  )
}
