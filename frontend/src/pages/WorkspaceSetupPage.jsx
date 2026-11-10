import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { appUrl } from '../utils/urls'
import {
  Globe,
  Loader2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  LayoutDashboard,
  Users,
  FolderKanban,
  Settings,
} from 'lucide-react'

import { authApi } from '../api/auth.api'
import { useAuth } from '../context/AuthContext'

import groveLogo from '../assets/Grove_transparent_logo(Green).png'

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
  const [slugStatus, setSlugStatus] = useState('idle')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const businessName = watch('business_name')
  const slug = watch('slug')

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

  // real-time slug availability check
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle')
      return
    }

    const timeout = setTimeout(async () => {
      try {
        setSlugStatus('checking')
        const res = await authApi.checkSlug(slug)
        setSlugStatus(res.data.available ? 'available' : 'taken')
      } catch {
        setSlugStatus('taken')
      }
    }, 500)

    return () => clearTimeout(timeout)
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
    <div className="min-h-screen bg-white flex flex-col lg:grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_520px]">
      
      {/* ── LEFT CONFIG PANEL ── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-16 max-w-2xl mx-auto w-full z-10">
        
        {/* Header Branding Row */}
        <div className="flex items-center justify-between w-full mb-12 lg:mb-0">
          <a href={appUrl(null, '/')} className="inline-block cursor-pointer outline-none">
            <img src={groveLogo} alt="Groven" className="h-8 w-auto object-contain" />
          </a>
        </div>

        {/* Form Body Structure */}
        <div className="my-auto py-6 w-full">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe7e1] bg-[#e6f5f0] px-3 py-1 text-[11px] font-medium text-[#0f6e56]">
              <Sparkles size={12} className="text-[#0f6e56]" />
              Final onboarding step
            </div>

            <h1 className="mt-4 text-[32px] sm:text-[38px] font-semibold tracking-tight text-[#141a14] leading-tight">
              Create your workspace
            </h1>

            <p className="mt-2.5 text-[14px] leading-6 text-[#6b756d]">
              Set up your agency platform identity, customized workspaces, and structural base address routing path down below.
            </p>
          </div>

          {/* Core Response Errors Feedback Banner */}
          {serverError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50/60 p-4 text-[13px] text-red-600 flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Field: Business Name */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-medium text-[#141a14]">
                  Business name
                </label>
              </div>

              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ea89e]"
                />
                <input
                  type="text"
                  placeholder="e.g. Acme Studio"
                  {...register('business_name')}
                  className={`h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-[14px] text-[#141a14] placeholder:text-[#9ea89e] outline-none transition-all ${
                    errors.business_name
                      ? 'border-red-300 focus:ring-red-100 ring-4 ring-red-50/50'
                      : 'border-[#e8eae8] focus:border-[#0f6e56] focus:ring-4 focus:ring-[#0f6e56]/10'
                  }`}
                />
              </div>

              {errors.business_name && (
                <p className="mt-1.5 text-[12px] text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.business_name.message}
                </p>
              )}
            </div>

            {/* Field: Workspace URL Slug */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-medium text-[#141a14]">
                  Workspace URL
                </label>
              </div>

              <div
                className={`flex h-12 items-center gap-2 rounded-xl border bg-white px-4 transition-all focus-within:ring-4 ${
                  errors.slug
                    ? 'border-red-300 focus-within:ring-red-100'
                    : 'border-[#e8eae8] focus-within:border-[#0f6e56] focus-within:ring-[#0f6e56]/10'
                }`}
              >
                <Globe size={16} className="text-[#9ea89e] shrink-0" />
                <span className="text-[14px] text-[#9ea89e] select-none">groven.in/</span>
                
                <input
                  type="text"
                  placeholder="acme-studio"
                  {...register('slug')}
                  className="flex-1 bg-transparent text-[14px] text-[#141a14] outline-none placeholder:text-[#9ea89e]"
                />

                {/* Inline Status Indicators */}
                {slugStatus === 'checking' && (
                  <Loader2 size={16} className="animate-spin text-[#9ea89e]" />
                )}
                {slugStatus === 'available' && (
                  <CheckCircle2 size={16} className="text-emerald-600" />
                )}
                {slugStatus === 'taken' && (
                  <XCircle className="text-red-500" size={16} />
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px]">
                <p className="text-[#9ea89e]">
                  Only lowercase letters, numbers, and hyphens are valid.
                </p>
                {slugStatus === 'available' && (
                  <p className="font-medium text-emerald-600">URL path available</p>
                )}
                {slugStatus === 'taken' && (
                  <p className="font-medium text-red-500">URL path taken</p>
                )}
              </div>

              {errors.slug && (
                <p className="mt-1.5 text-[12px] text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.slug.message}
                </p>
              )}
            </div>

            {/* Form Execution Submit Trigger */}
            <button
              type="submit"
              disabled={isSubmitting || slugStatus === 'taken' || slugStatus === 'checking'}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0f6e56] text-[14px] font-semibold text-white transition-all hover:bg-[#085041] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Building infrastructure...
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
        <div className="text-[11px] text-[#9ea89e] mt-12 lg:mt-0">
          By proceeding, you agree to Groven's System Framework Terms of Service.
        </div>
      </div>

      {/* ── RIGHT PREVIEW CONTEXT PANEL ── */}
      <div className="hidden lg:flex flex-col bg-[#f7f8f7] border-l border-[#eef0ee] relative overflow-hidden p-8 justify-center select-none">
        
        {/* Subtle decorative mesh background gradient overlay accent */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(15,110,86,0.05),transparent_60%)]" />
        
        {/* Real-time Workspace Canvas Simulation container frame */}
        <div className="w-full bg-white rounded-2xl border border-[#e8eae8] shadow-[0px_32px_64px_rgba(10,46,36,0.06)] overflow-hidden flex flex-col aspect-[4/3] relative z-10">
          
          {/* Top Address Navigation bar element simulation */}
          <div className="bg-[#f7f8f7] border-b border-[#eef0ee] px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eef0ee]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#eef0ee]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#eef0ee]" />
            </div>
            <div className="flex-1 bg-white border border-[#eef0ee] rounded-md h-6 flex items-center px-2.5 gap-1.5 text-[11px] text-[#9ea89e] overflow-hidden truncate">
              <span className="text-[#6b756d]">https://</span>
              <span className="text-[#0f6e56] font-medium transition-colors duration-200">
                {workspaceUrl}
              </span>
            </div>
          </div>

          {/* Sub-Layout Sidebar vs Workspace Content Canvas Layout frame split */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Simulated Workspace Application Sidebar context navigation */}
            <div className="w-44 border-r border-[#eef0ee] p-3 flex flex-col justify-between bg-white shrink-0">
              <div className="space-y-3">
                <div className="px-2 py-1.5 rounded-lg bg-[#e6f5f0] border border-[#dbe7e1] flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded bg-[#0f6e56] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {(businessName || 'Y').trim().charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[12px] font-semibold text-[#141a14] truncate">
                    {businessName || 'Your Workspace'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#f7f8f7] text-[#0f6e56] text-[11px] font-medium">
                    <LayoutDashboard size={12} /> Dashboard
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-[#9ea89e] text-[11px]">
                    <Users size={12} /> Clients
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-[#9ea89e] text-[11px]">
                    <FolderKanban size={12} /> Projects
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2 py-1.5 text-[#9ea89e] text-[11px] border-t border-[#f7f8f7] pt-2">
                <Settings size={12} /> Settings
              </div>
            </div>

            {/* Dashboard Workspace Interior Page Canvas Body view simulation */}
            <div className="flex-1 p-5 bg-[#f7f8f7] overflow-hidden flex flex-col gap-4">
              <div className="h-6 w-24 bg-white border border-[#e8eae8] rounded-md shrink-0" />
              
              {/* Simulated Content Grid components */}
              <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="bg-white border border-[#eef0ee] rounded-xl p-3 flex flex-col justify-between">
                  <span className="w-8 h-2 bg-[#f7f8f7] rounded" />
                  <span className="w-12 h-4 bg-[#e6f5f0] rounded" />
                </div>
                <div className="bg-white border border-[#eef0ee] rounded-xl p-3 flex flex-col justify-between">
                  <span className="w-8 h-2 bg-[#f7f8f7] rounded" />
                  <span className="w-10 h-4 bg-[#f7f8f7] rounded" />
                </div>
              </div>

              <div className="h-16 w-full bg-white border border-[#eef0ee] rounded-xl shrink-0" />
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}