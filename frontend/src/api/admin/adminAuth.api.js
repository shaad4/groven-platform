import adminApi from './adminClient'

const adminAuthApi = {

  login: (data) => adminApi.post('/login/', data),

  refresh: () => adminApi.post('/token/refresh/'),

  logout: () => adminApi.post('/auth/logout/'),

}

export default adminAuthApi