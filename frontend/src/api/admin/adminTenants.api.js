import adminApi from './adminClient'

const adminTenantsApi = {

  list: (params) => adminApi.get('/tenants/', { params }),

  get: (tenantId) => adminApi.get(`/tenants/${tenantId}/`),

  upgrade: (tenantId) => adminApi.post(`/tenants/${tenantId}/upgrade/`),

  downgrade: (tenantId) => adminApi.post(`/tenants/${tenantId}/downgrade/`),

  suspend: (tenantId) => adminApi.post(`/tenants/${tenantId}/suspend/`),

  unsuspend: (tenantId) => adminApi.post(`/tenants/${tenantId}/unsuspend/`),

  overrideLimit: (tenantId, limit) =>
    adminApi.post(`/tenants/${tenantId}/override-limit/`, { limit }),

}

export default adminTenantsApi