import adminApi from './adminClient'

const adminUsersApi = {

  list: (params) => adminApi.get('/users/', { params }),

  sendPasswordReset: (userId) =>
    adminApi.post(`/users/${userId}/send-password-reset/`),

  deactivate: (userId) =>
    adminApi.post(`/users/${userId}/deactivate/`),

}

export default adminUsersApi