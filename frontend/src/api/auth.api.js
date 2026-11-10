import api from './client'
import { getSubdomain } from '../utils/domain'

export const authApi = {

  //Provider signup flow 

  signup: (data) =>
    api.post('/auth/register/', data),

  verifyEmail: (token) =>
    api.post('/auth/verify-email/', { token }),

  setupWorkspace: (data) =>
    api.post('/auth/setup-workspace/', data),

  checkSlug: (slug) =>
    api.get(`/auth/check-slug/?slug=${slug}`),


  //Global login (groven.in)
  login: (data) =>
    api.post('/auth/login/', data),

  googleAuth: (accessToken) =>
    api.post('/auth/google/', { access_token: accessToken }),


  //Session management 

  logout: () => {
    const slug = getSubdomain()
    return api.post(
      '/auth/logout/',
      slug ? { slug } : {},
      slug ? { headers: { 'X-Tenant-Slug': slug } } : {}
    )
  },

  refreshToken: () => {
    const slug = getSubdomain()
    return api.post(
      '/auth/token/refresh/',
      { slug: slug || null },
      slug ? { headers: { 'X-Tenant-Slug': slug } } : {}
    )
  },

  me: (accessToken) => {
    const slug = getSubdomain()
    const headers = {}
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    if (slug) headers['X-Tenant-Slug'] = slug
    return api.get('/auth/me/', { headers })
  },

  getMemberships: (accessToken) =>
    api.get('/auth/memberships/', {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    }),



  //Password reset (works for all users)

  forgotPassword: (email) =>
    api.post('/auth/forgot-password/', { email }),

  resetPassword: (token, password) =>
    api.post('/auth/reset-password/', { token, password }),


  //Client management (called by providers)

  listClients: () =>
    api.get('/clients/'),

  addClient: (data) =>
    api.post('/clients/', data),


  //Client invite flow

  validateInviteToken: (token) =>
    api.get(`/clients/invite/validate/?token=${token}`),

  acceptInvite: (data) =>
    api.post('/clients/invite/accept/', data),


  //Client auth (subdomain only) 

  clientLogin: (data) =>
    api.post('/clients/login/', data, {
      headers: { 'X-Tenant-Slug': getSubdomain() },
    }),

  clientForgotPassword: (email) =>
    api.post('/clients/forgot-password/', { email }, {
      headers: { 'X-Tenant-Slug': getSubdomain() },
    }),

  clientResetPassword: (token, password) =>
    api.post('/clients/reset-password/', { token, password }, {
      headers: { 'X-Tenant-Slug': getSubdomain() },
    }),


  //Tenant validation 

  checkTenantSlug: (slug) =>
    api.get(`/tenants/validate/?slug=${slug}`),

  getTenantInfo: () => {
    const slug = getSubdomain()
    return api.get('/tenants/info/', {
      headers: slug ? { 'X-Tenant-Slug': slug } : {},
    })
  },

}