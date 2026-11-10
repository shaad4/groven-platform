import { useEffect, useState } from 'react'
import { Save, CreditCard } from 'lucide-react'
import AdminSlidePanel, { PanelHeader, PanelBody } from '../ui/AdminSlidePanel'
import { AdminButton } from '../ui/AdminUI'
import adminPlansApi from '../../api/admin/adminPlans.api'

export default function PlanDetailsPanel({ open, onClose, plans, onChanged }) {
  const [form, setForm] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (plans?.length) {
      const next = {}
      plans.forEach((p) => {
        next[p.id] = {
          price_monthly: p.price_monthly,
          client_limit: String(p.client_limit),
          request_limit: String(p.request_limit),
        }
      })
      setForm(next)
      setSavedId(null)
      setErrors({})
    }
  }, [plans])

  if (!plans?.length) return null

  const update = (planId, field, value) => {
    setForm((prev) => ({ ...prev, [planId]: { ...prev[planId], [field]: value } }))
    setSavedId(null)
  }

  const handleSave = async (plan) => {
    setSavingId(plan.id)
    setErrors((prev) => ({ ...prev, [plan.id]: '' }))
    try {
      const values = form[plan.id]
      await adminPlansApi.updatePlan(plan.id, {
        price_monthly: values.price_monthly === '' ? null : Number(values.price_monthly),
        client_limit: values.client_limit === '' ? null : Number(values.client_limit),
        request_limit: values.request_limit === '' ? null : Number(values.request_limit),
      })
      setSavedId(plan.id)
      onChanged?.()
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [plan.id]: err?.response?.data?.message || 'Could not save plan.',
      }))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AdminSlidePanel open={open} onClose={onClose} width={460} tone="accent">
      <PanelHeader
        eyebrow="Billing"
        title="Plan details"
        subtitle="Price changes apply to new subscriptions only — existing Pro tenants keep their current rate."
        onClose={onClose}
      />
      <PanelBody>
        <div className="space-y-6">
          {plans.map((plan) => {
            const values = form[plan.id] || {}
            return (
              <div key={plan.id} className="rounded-xl border border-[#E5E8E5] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold capitalize text-[#10241C]">{plan.name}</h3>
                  {plan.has_stripe_price && (
                    <span className="flex items-center gap-1 text-[11px] text-[#9BA39B]">
                      <CreditCard size={12} /> Synced with Stripe
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block text-[12px] text-[#5B655C]">Price / month ($)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={values.price_monthly ?? ''}
                      onChange={(e) => update(plan.id, 'price_monthly', e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#D8DCD8] px-3 text-[13px] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] text-[#5B655C]">Client limit</label>
                    <input
                      type="number"
                      value={values.client_limit ?? ''}
                      onChange={(e) => update(plan.id, 'client_limit', e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#D8DCD8] px-3 text-[13px] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] text-[#5B655C]">Request limit</label>
                    <input
                      type="number"
                      value={values.request_limit ?? ''}
                      onChange={(e) => update(plan.id, 'request_limit', e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#D8DCD8] px-3 text-[13px] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-[#9BA39B]">Use -1 for unlimited.</p>

                <div className="mt-3 flex items-center gap-3">
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    icon={Save}
                    loading={savingId === plan.id}
                    onClick={() => handleSave(plan)}
                  >
                    Save
                  </AdminButton>
                  {savedId === plan.id && <span className="text-[12px] text-[#1D9E75]">Saved</span>}
                </div>
                {errors[plan.id] && (
                  <p className="mt-2 text-[12px] text-[#C73A30]">{errors[plan.id]}</p>
                )}
              </div>
            )
          })}
        </div>
      </PanelBody>
    </AdminSlidePanel>
  )
}