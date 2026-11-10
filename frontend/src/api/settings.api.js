import api from './client'


// User Profile

export const getProfile = () => 
    api.get('/settings/profile/')

export const updateProfile = (data) =>
  api.patch('/settings/profile/', data)

export const changePassword = ({ currentPassword, newPassword, confirmPassword }) =>
  api.patch('/settings/profile/', {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  })


export const uploadAvatar = (file) => {
  const form = new FormData()
  form.append('avatar', file)
  return api.post('/settings/avatar/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// workspace (provider)

export const getWorkspace = () =>
  api.get('/settings/workspace/')


export const updateWorkspace = (data) =>
  api.patch('/settings/workspace/', data)

export const uploadLogo = (file) => {
  const form = new FormData()
  form.append('logo', file)
  return api.post('/settings/logo/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
 

//Notifications
export const getNotifications = () =>
  api.get('/settings/notifications/')


export const updateNotifications = (data) =>
  api.patch('/settings/notifications/', data)



//Delete Account
export const deleteAccount = () =>
  api.post('/settings/delete-account/', { confirm: true })

