import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import wsReducer from '../features/ws/wsSlice'
import billingReducer from '../features/billing/billingSlice'
import adminAuthReducer from '../features/adminAuth/adminAuthSlice'



export const store = configureStore({
  reducer: {
    auth: authReducer,
    ws: wsReducer,
    billing: billingReducer,
    adminAuth: adminAuthReducer,
  },
  devTools: import.meta.env.DEV,
})

