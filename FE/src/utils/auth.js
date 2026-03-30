export const normalizeRole = (role) => String(role || '').trim().toLowerCase()

export const isDashboardRole = (role) => {
  const normalizedRole = normalizeRole(role)
  return normalizedRole === 'owner' || normalizedRole === 'staff'
}

export const getRouteByRole = (role) => {
  const normalizedRole = normalizeRole(role)

  if (normalizedRole === 'owner') {
    return '/owner/dashboard'
  }

  if (normalizedRole === 'staff') {
    return '/staff'
  }

  return '/'
}
