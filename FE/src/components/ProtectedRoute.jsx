import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

const ProtectedRoute = ({ roles }) => {
  const location = useLocation()
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
