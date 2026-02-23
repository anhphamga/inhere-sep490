export const getRouteByRole = (role) => {
  if (role === 'owner') {
    return '/owner/dashboard'
  }

  if (role === 'staff') {
    return '/staff'
  }

  return '/'
}
