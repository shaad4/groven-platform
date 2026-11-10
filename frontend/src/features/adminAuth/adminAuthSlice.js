import { createSlice } from '@reduxjs/toolkit'

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState: {
    accessToken: null,
    admin: null, // { email }
  },

  reducers: {
    setAdminCredentials(state, { payload }) {
      if (payload.accessToken !== undefined) state.accessToken = payload.accessToken
      if (payload.admin !== undefined) state.admin = payload.admin
    },
    setAdminAccessToken(state, { payload }) {
      state.accessToken = payload
    },
    clearAdminAuth(state) {
      state.accessToken = null
      state.admin = null
    },
  },
})

export const { setAdminCredentials, setAdminAccessToken, clearAdminAuth } = adminAuthSlice.actions

export const selectAdminAccessToken = (s) => s.adminAuth.accessToken
export const selectAdminUser = (s) => s.adminAuth.admin
export const selectIsAdminAuth = (s) => !!s.adminAuth.accessToken && !!s.adminAuth.admin

export default adminAuthSlice.reducer