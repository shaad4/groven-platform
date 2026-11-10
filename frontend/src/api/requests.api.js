import api from './client'

const requestsApi = {
  //  Shared 
  list: (params = {}) => api.get('/requests/', { params }),
  get: (id) => api.get(`/requests/${id}/`),
  getActivity: (id) => api.get(`/requests/${id}/activity/`),
  getFiles: (id) => api.get(`/requests/${id}/files/`),
  getDeliveries: (id) => api.get(`/requests/${id}/deliveries/`),

  // Client only 
  create: (data) => api.post('/requests/', data),
  update: (id, data) => api.patch(`/requests/${id}/`, data),

  // Provider only 
  updateStatus: (id, status) => api.patch(`/requests/${id}/status/`, { status }),
  setUrgent: (id, is_urgent) => api.patch(`/requests/${id}/flag/`, { is_urgent }),
  setDueDate: (id, due_date) => api.patch(`/requests/${id}/due-date/`, { due_date }),

  // Notes
  getNotes: (id) => api.get(`/requests/${id}/notes/`),
  addNote: (id, content) => api.post(`/requests/${id}/notes/`, { content }),

  // Delivery
  createDelivery: (id, data) => api.post(`/requests/${id}/deliveries/`, data),
  reviewDelivery: (requestId, deliveryId, action, message = '') => 
    api.post(`/requests/${requestId}/deliveries/${deliveryId}/review/`, { action, message }),

  // S3 upload flow
  presignUpload: (data) => api.post('/requests/files/upload/presign/', data),
  confirmUpload: (data) => api.post('/requests/files/upload/confirm/', data),

  // Upload a file end-to-end (presign → S3 → confirm) — returns File record
  uploadFile: async (requestId, file) => {
    // Step 1 — get presigned URL
    const presignRes = await api.post('/requests/files/upload/presign/', {
      request_id: requestId,
      file_name: file.name,
      file_type: file.type,
    })
    const { upload_url, fields, s3_key } = presignRes.data.data

    // Step 2 — upload directly to S3
    const formData = new FormData()
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v))
    formData.append('file', file)
    await fetch(upload_url, { method: 'POST', body: formData })

    // Step 3 — confirm with backend
    const confirmRes = await api.post('/requests/files/upload/confirm/', {
      request_id: requestId,
      file_name: file.name,
      s3_key,
      file_size_bytes: file.size,
      file_type: file.type,
    })
    return confirmRes.data.data
  },

  // Chat
  getMessages: (requestId) => api.get(`/requests/${requestId}/messages/`),
  sendMessage: (requestId, data) => api.post(`/requests/${requestId}/messages/`, data),
  markRead: (requestId) => api.post(`/requests/${requestId}/messages/mark-read/`),

  // AI
  regenerateSummary: (id) => api.post(`/requests/${id}/regenerate-summary/`),
  suggestReplies: (id) => api.post(`/requests/${id}/suggest-replies/`),
  suggestDeliveryMessage: (id) => api.post(`/requests/${id}/suggest-delivery-message/`),

}

export default requestsApi