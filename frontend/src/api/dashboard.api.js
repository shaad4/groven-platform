import api from './client'

const dashboardApi = {
    getStats: () => api.get('/dashboard/stats/'),
    getBadges: () => api.get('/dashboard/badges/'),
    getActivityFeed: (params = {}) => api.get('/dashboard/activity/', { params }),
    getActivityExport: (params = {}) => api.get('/dashboard/activity/export/', { params, responseType: 'blob' }),
}

export default dashboardApi
