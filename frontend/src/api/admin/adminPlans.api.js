import adminApi from './adminClient'

const adminPlansApi = {
  list: () => adminApi.get('/plans/'),
  updatePlan: (planId, payload) => adminApi.post(`/plans/${planId}/update/`, payload),
}

export default adminPlansApi