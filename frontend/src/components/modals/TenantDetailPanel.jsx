import { useState } from 'react'
import { Mail, Calendar, ArrowUpCircle, ArrowDownCircle, Ban, Save } from 'lucide-react'
import AdminSlidePanel, { PanelHeader, PanelBody } from '../ui/AdminSlidePanel'
import { AdminButton, PlanBadge, UsageBar } from '../ui/AdminUI'
import ConfirmActionModal from './ConfirmActionModal'
import adminTenantsApi from '../../api/admin/adminTenants.api'
import { joinedLabel } from '../../utils/adminDisplay'

export default function TenantDetailPanel({ open, onClose, tenant, onChanged }) {
  const [confirm, setConfirm] = useState(null) // 'downgrade' | 'suspend' | null
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const [limitInput, setLimitInput] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)
  const [limitSaved, setLimitSaved] = useState(false)

  if (!tenant) return null

  const isPro = (tenant.plan || '').toLowerCase() === 'pro'

  const runAction = async (action) => {
    setActionLoading(true)
    setActionError('')
    try {
      if (action === 'upgrade') await adminTenantsApi.upgrade(tenant.id)
      if (action === 'downgrade') await adminTenantsApi.downgrade(tenant.id)
      if (action === 'suspend') await adminTenantsApi.suspend(tenant.id)
      if (action === 'unsuspend') await adminTenantsApi.unsuspend(tenant.id)
      onChanged?.()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Action failed. Please try again.')
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveLimit = async () => {
    setSavingLimit(true)
    setLimitSaved(false)
    setActionError('')
    try {
      await adminTenantsApi.overrideLimit(tenant.id, limitInput === '' ? null : Number(limitInput))
      setLimitSaved(true)
      onChanged?.()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not save override.')
    } finally {
      setSavingLimit(false)
    }
  }

  return (
    <>
      <AdminSlidePanel open={open} onClose={onClose} width={460} tone={tenant.is_suspended ? 'danger' : 'neutral'}>
        <PanelHeader
          eyebrow="Tenant"
          title={tenant.name}
          subtitle={`${tenant.slug}.groven.in`}
          onClose={onClose}
        />
        <PanelBody>
          <div className="flex items-center gap-2">
            <PlanBadge plan={tenant.plan} />
            {tenant.is_suspended && (
              <span className="rounded-md bg-[#FDF1EF] px-2 py-0.5 text-[11px] font-medium text-[#C73A30]">
                Suspended
              </span>
            )}
          </div>

          <div className="mt-5 space-y-2.5 text-[13px]">
            {tenant.provider_email && (
              <div className="flex items-center gap-2.5 text-[#5B655C]">
                <Mail size={14} className="text-[#9BA39B]" />
                {tenant.provider_email}
              </div>
            )}
            <div className="flex items-center gap-2.5 text-[#5B655C]">
              <Calendar size={14} className="text-[#9BA39B]" />
              Member since {joinedLabel(tenant.created_at)}
            </div>
          </div>

          {tenant.clients?.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9BA39B]">
                Clients on this workspace
              </p>
              <div className="space-y-1 rounded-lg border border-[#EEF1EE]">
                {tenant.clients.map((c, i) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between px-3 py-2.5 ${
                      i !== tenant.clients.length - 1 ? 'border-b border-[#EEF1EE]' : ''
                    }`}
                  >
                    <span className="text-[13px] text-[#2A332E]">{c.name || c.email || 'Unnamed client'}</span>
                    {c.email && c.name && (
                      <span className="text-[12px] text-[#9BA39B]">{c.email}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9BA39B]">Usage</p>
            <UsageBar used={tenant.client_count} limit={tenant.client_limit} label="Clients" />
            <UsageBar used={tenant.request_count} limit={tenant.request_limit} label="Requests" />
          </div>

          {/* Limit override — free plan only */}
          {!isPro && (
            <div className="mt-6 border-t border-[#EEF1EE] pt-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#9BA39B]">
                Limit override
              </p>
              <div className="flex items-center gap-2.5">
                <input
                  type="number"
                  min={0}
                  value={limitInput}
                  onChange={(e) => { setLimitInput(e.target.value); setLimitSaved(false) }}
                  placeholder={String(tenant.client_limit)}
                  className="h-9 w-24 rounded-lg border border-[#D8DCD8] px-3 text-[13px] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
                />
                <AdminButton size="sm" variant="secondary" icon={Save} onClick={handleSaveLimit} loading={savingLimit}>
                  Save
                </AdminButton>
                {limitSaved && <span className="text-[12px] text-[#1D9E75]">Saved</span>}
              </div>
              <p className="mt-1.5 text-[12px] text-[#9BA39B]">
                Custom client limit for this free tenant. Leave blank to clear the override.
              </p>
            </div>
          )}

          {actionError && (
            <p className="mt-4 text-[12px] text-[#C73A30]">{actionError}</p>
          )}

          {/* Plan / suspension actions */}
          <div className="mt-6 space-y-2 border-t border-[#EEF1EE] pt-5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#9BA39B]">Actions</p>

            {!isPro ? (
              <ActionRow
                icon={ArrowUpCircle}
                title="Upgrade to Pro"
                description="Instantly sets tenant plan to Pro"
                onClick={() => runAction('upgrade')}
                loading={actionLoading}
              />
            ) : (
              <ActionRow
                icon={ArrowDownCircle}
                title="Downgrade to Free"
                description="Reverts plan & re-enforces free plan limits"
                onClick={() => setConfirm('downgrade')}
              />
            )}

            {tenant.is_suspended ? (
              <ActionRow
                icon={Ban}
                title="Unsuspend workspace"
                description="Restores tenant logins"
                onClick={() => runAction('unsuspend')}
                loading={actionLoading}
              />
            ) : (
              <ActionRow
                icon={Ban}
                title="Suspend workspace"
                description="Blocks all tenant logins · Requires confirmation"
                danger
                onClick={() => setConfirm('suspend')}
              />
            )}
          </div>
        </PanelBody>
      </AdminSlidePanel>

      <ConfirmActionModal
        open={confirm === 'suspend'}
        onClose={() => setConfirm(null)}
        title="Suspend workspace"
        targetName={tenant.name}
        description="All members of this tenant — provider and clients — will be immediately blocked from logging in. Data is preserved."
        confirmLabel="Suspend workspace"
        tone="danger"
        onConfirm={() => runAction('suspend')}
      />

      <ConfirmActionModal
        open={confirm === 'downgrade'}
        onClose={() => setConfirm(null)}
        title="Downgrade to Free"
        targetName={tenant.name}
        description="Free plan limits (3 clients, 10 requests) will be re-enforced immediately. Existing data beyond the limit is retained but new creation will be blocked."
        confirmLabel="Downgrade to Free"
        tone="danger"
        onConfirm={() => runAction('downgrade')}
      />
    </>
  )
}

function ActionRow({ icon: Icon, title, description, onClick, loading, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
        danger
          ? 'border-[#F3D2CE] hover:bg-[#FDF1EF]'
          : 'border-[#EEF1EE] hover:bg-[#FAFBFA]'
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          danger ? 'bg-[#FDF1EF] text-[#C73A30]' : 'bg-[#EEF1EE] text-[#5B655C]'
        }`}
      >
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-medium ${danger ? 'text-[#C73A30]' : 'text-[#10241C]'}`}>{title}</p>
        <p className="text-[12px] text-[#9BA39B]">{description}</p>
      </div>
    </button>
  )
}