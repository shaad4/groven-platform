import { createSlice } from "@reduxjs/toolkit"

const billingSlice = createSlice({
    name: 'billing',
    initialState: {
        isUpgradeModalOpen: false,
        upgradeReason: null,   
        upgradeMessage: null,  
    },

    reducers: {
        openUpgradeModal(state, { payload }) {
            state.isUpgradeModalOpen = true
            state.upgradeReason = payload?.reason ?? null
            state.upgradeMessage = payload?.message ?? null
        },
        closeUpgradeModal(state) {
            state.isUpgradeModalOpen = false
            state.upgradeReason = null
            state.upgradeMessage = null
        },
    },
})

export const { openUpgradeModal, closeUpgradeModal } = billingSlice.actions

export const selectIsUpgradeModalOpen = (s) => s.billing.isUpgradeModalOpen
export const selectUpgradeReason = (s) => s.billing.upgradeReason
export const selectUpgradeMessage = (s) => s.billing.upgradeMessage

export default billingSlice.reducer