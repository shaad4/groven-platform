import api from './client'

export const getPlanPricing = () =>
    api.get('/billing/pricing/')