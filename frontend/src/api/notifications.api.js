import api from './client'

const notificationsApi = {
  list: () => api.get('/notifications/'),

  markRead: (id) => api.post(`/notifications/${id}/read/`),

  markAllRead: () => api.post('/notifications/read-all/'),
}

export default notificationsApi