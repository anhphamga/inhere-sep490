export const getRouteByRole = (role) => {
  if (role === 'owner') {
    return '/owner'
  }

  if (role === 'staff') {
    return '/staff'
  }

  return '/'
}
