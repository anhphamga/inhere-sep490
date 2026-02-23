export const getRouteByRole = (role) => {
  if (role === 'owner') {
    return '/owner/dashboard'
  }

  return '/'
}
