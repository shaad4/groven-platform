import { createSlice } from "@reduxjs/toolkit"

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        accessToken: null,
        user: null, // { id, email, display_name, role }
        tenant: null,  // { id, name, slug }
        memberships : null,  // { provider_portals: [], client_portals: [] }
        membership_count: 0,
    },

    reducers: {
        setCredentials(state, { payload }) {
            if (payload.accessToken !== undefined) state.accessToken = payload.accessToken
            if (payload.user !== undefined) state.user = payload.user
            if (payload.tenant !== undefined) state.tenant      = payload.tenant
            if (payload.membership_count !== undefined) state.membership_count = payload.membership_count
        },
        setAccessToken(state, { payload }) {
            state.accessToken = payload
        },
        setMemberships(state, { payload }){
            state.memberships = payload
        },
        clearAuth(state) {
            state.accessToken = null
            state.user = null
            state.tenant = null
            state.memberships = null
            state.membership_count = 0
        },
    },
})

export const { setCredentials, setAccessToken, setMemberships, clearAuth } = authSlice.actions

export const selectAccessToken = (s) => s.auth.accessToken
export const selectCurrentUser = (s) => s.auth.user
export const selectTenant = (s) => s.auth.tenant
export const selectMemberships = (s) => s.auth.memberships
export const selectIsAuth = (s) => !!s.auth.accessToken && !!s.auth.user
export const selectRole = (s) => s.auth.user?.role ?? null
export const selectTotalPortalCount  = (s) => {
  const m = s.auth.memberships
  if (!m) return s.auth.membership_count || 0
  return (m.provider_portals?.length ?? 0) + (m.client_portals?.length ?? 0)
}
export default authSlice.reducer