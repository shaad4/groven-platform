import adminApi from './adminClient'

const adminStatsApi = {

  getStats: () => adminApi.get('/stats/'),

}

export default adminStatsApi