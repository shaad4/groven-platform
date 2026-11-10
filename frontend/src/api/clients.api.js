import api from './client'

const clientsApi = {
    
    list: () => api.get('/clients/'),

    get: (clientId) => api.get(`/clients/${clientId}/`),

    update: (clientId, data) => api.patch(`/clients/${clientId}/`, data),

    delete: (clientId) => api.delete(`/clients/${clientId}/`),

    deactivate: (clientId) => api.post(`/clients/${clientId}/deactivate/`),

    reactivate: (clientId) => api.post(`/clients/${clientId}/reactivate/`),

    resendInvite: (clientId) => api.post(`/clients/${clientId}/resend-invite/`),

}

export default clientsApi