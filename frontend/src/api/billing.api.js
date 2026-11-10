import api from './client'

export const createCheckoutSession = ({ successUrl, cancelUrl } = {}) =>
  api.post('/billing/create-checkout-session/', {
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

export const getBillingPortalUrl = ({ returnUrl } = {}) =>
api.post('/billing/portal/', {
return_url: returnUrl,
})

export const getBillingHistory = () =>
  api.get('/billing/history/')