import { useEffect, useState } from 'react'
import { ArrowUpCircle, Save } from 'lucide-react'
import AdminSlidePanel, { PanelHeader, PanelBody } from '../ui/AdminSlidePanel'
import { AdminButton, PlanBadge, UsageBar } from '../ui/AdminUI'
import adminTenantsApi from '../../api/admin/adminTenants.api'

export default function PlanOverridePanel({ open, onClose, tenant, onChanged }) {
  const [clientLimit, setClientLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (tenant) {
      setClientLimit(String(tenant.client_limit ?? ''))
      setSaved(false)
      setError('')
    }
  }, [tenant])

  if (!tenant) return null

  const isPro = (tenant.plan || '').toLowerCase() === 'pro'

  const handleUpgrade = async () => {
    setUpgrading(true)
    setError('')
    try {
      await adminTenantsApi.upgrade(tenant.tenant_id)
      onChanged?.()
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not upgrade tenant.')
    } finally {
      setUpgrading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      // Backend only exposes a single client-limit override endpoint
      // (apps/grove_admin/services.py → override_client_limit). There is
      // no separate request-limit override — request_limit comes from
      // the plan itself, not a per-tenant override.
      await adminTenantsApi.overrideLimit(tenant.tenant_id, clientLimit === '' ? null : Number(clientLimit))
      setSaved(true)
      onChanged?.()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save override.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminSlidePanel open={open} onClose={onClose} width={420} tone="neutral">
      <PanelHeader title={tenant.tenant_name} onClose={onClose} />
      <PanelBody>
        <PlanBadge plan={tenant.plan} />

        <div className="mt-6 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9BA39B]">Usage</p>
          <UsageBar used={tenant.client_count} limit={tenant.client_limit} label="Clients" />
          <UsageBar used={tenant.request_count} limit={tenant.request_limit} label="Requests" />
        </div>

        {!isPro && (
          <div className="mt-6 border-t border-[#EEF1EE] pt-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#9BA39B]">
              Plan actions
            </p>
            <AdminButton
              variant="secondary"
              icon={ArrowUpCircle}
              className="w-full justify-center"
              onClick={handleUpgrade}
              loading={upgrading}
            >
              Upgrade to Pro
            </AdminButton>
            <p className="mt-1.5 text-[12px] text-[#9BA39B]">Instantly sets plan to Pro</p>

            <div className="mt-6 border-t border-[#EEF1EE] pt-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#9BA39B]">
                Limit override
              </p>
              <div className="flex items-center justify-between gap-3">
                <label className="text-[13px] text-[#5B655C]">Client limit</label>
                <input
                  type="number"
                  min={0}
                  value={clientLimit}
                  onChange={(e) => { setClientLimit(e.target.value); setSaved(false) }}
                  className="h-9 w-24 rounded-lg border border-[#D8DCD8] px-3 text-[13px] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
                />
              </div>
              <p className="mt-1.5 text-[12px] text-[#9BA39B]">Leave blank to clear the override.</p>

              <AdminButton
                size="sm"
                variant="secondary"
                icon={Save}
                className="mt-4"
                onClick={handleSave}
                loading={saving}
              >
                Save changes
              </AdminButton>
              {saved && <span className="ml-3 text-[12px] text-[#1D9E75]">Saved</span>}
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-[12px] text-[#C73A30]">{error}</p>}
      </PanelBody>
    </AdminSlidePanel>
  )
}