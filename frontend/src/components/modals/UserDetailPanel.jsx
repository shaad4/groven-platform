import { useState } from 'react'
import { Mail, Send, Ban, RotateCcw } from 'lucide-react'
import AdminSlidePanel, { PanelHeader, PanelBody } from '../ui/AdminSlidePanel'
import { RoleBadge, StatusPill } from '../ui/AdminUI'
import ConfirmActionModal from './ConfirmActionModal'
import adminUsersApi from '../../api/admin/adminUsers.api'
import { joinedLabel, relativeTimeLabel } from '../../utils/adminDisplay'

export default function UserDetailPanel({ open, onClose, user, onChanged }) {
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [error, setError] = useState('')

  if (!user) return null

  const isDeactivated = !user.is_active

  const handleSendReset = async () => {
    setSendingReset(true)
    setError('')
    try {
      await adminUsersApi.sendPasswordReset(user.id)
      setResetSent(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send reset email.')
    } finally {
      setSendingReset(false)
    }
  }

  const handleDeactivateToggle = async () => {
    await adminUsersApi.deactivate(user.id)
    onChanged?.()
  }

  return (
    <>
      <AdminSlidePanel open={open} onClose={onClose} width={440} tone={isDeactivated ? 'danger' : 'neutral'}>
        <PanelHeader title={user.display_name} subtitle={user.email} onClose={onClose} />
        <PanelBody>
          <div className="flex items-center gap-2">
            <RoleBadge role={user.role} />
            <StatusPill status={user.is_active ? 'Active' : 'Deactivated'} />
          </div>

          <div className="mt-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9BA39B]">User info</p>
            <div className="space-y-2.5 rounded-lg border border-[#EEF1EE] p-4 text-[13px]">
              <Row label="Workspace" value={user.tenant_slug ? `${user.tenant_slug}.groven.in` : '—'} link />
              <Row label="Joined" value={joinedLabel(user.joined_at)} />
              <Row label="Last login" value={relativeTimeLabel(user.last_login) || 'Never'} />
              <Row label="User ID" value={user.id} mono />
            </div>
          </div>

          {error && <p className="mt-4 text-[12px] text-[#C73A30]">{error}</p>}

          <div className="mt-6 space-y-2">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#9BA39B]">Actions</p>

            <ActionRow
              icon={Send}
              title="Send Password Reset Email"
              description="Triggers reset link to user's email"
              onClick={handleSendReset}
              loading={sendingReset}
              done={resetSent}
              doneLabel="Sent"
            />

            {/* <ActionRow
              icon={Mail}
              title="Resend Invite"
              description="Not available — invite status isn't tracked at the user level"
              disabled
            /> */}

            {isDeactivated ? (
              <ActionRow
                icon={RotateCcw}
                title="Reactivate User"
                description="Restores login access"
                onClick={handleDeactivateToggle}
              />
            ) : (
              <ActionRow
                icon={Ban}
                title="Deactivate User"
                description="Blocks login · Reversible · Requires confirmation"
                danger
                onClick={() => setConfirmDeactivate(true)}
              />
            )}
          </div>
        </PanelBody>
      </AdminSlidePanel>

      <ConfirmActionModal
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        title="Deactivate user"
        targetName={user.display_name}
        description="This blocks the user from logging in. All data is preserved, and the action can be reversed later."
        confirmLabel="Deactivate user"
        tone="danger"
        onConfirm={handleDeactivateToggle}
      />
    </>
  )
}

function Row({ label, value, link, mono }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#7C867D]">{label}</span>
      <span className={`${link ? 'text-[#0F6E56] font-medium' : 'text-[#2A332E]'} ${mono ? 'font-mono text-[12px]' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function ActionRow({ icon: Icon, title, description, onClick, loading, danger, disabled, done, doneLabel }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled || done}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-50 ${
        danger ? 'border-[#F3D2CE] hover:bg-[#FDF1EF]' : 'border-[#EEF1EE] hover:bg-[#FAFBFA]'
      }`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${danger ? 'bg-[#FDF1EF] text-[#C73A30]' : 'bg-[#EEF1EE] text-[#5B655C]'}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-medium ${danger ? 'text-[#C73A30]' : 'text-[#10241C]'}`}>{title}</p>
        <p className="text-[12px] text-[#9BA39B]">{description}</p>
      </div>
      {done && <span className="text-[12px] font-medium text-[#1D9E75]">{doneLabel}</span>}
    </button>
  )
}