import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ProfilePage from './pages/auth/ProfilePage'
import OwnerLayout from './pages/owner/OwnerLayout'
import OwnerDashboardScreen from './pages/owner/OwnerDashboardScreen'
import OwnerAnalyticsScreen from './pages/owner/OwnerAnalyticsScreen'
import OwnerUsersScreen from './pages/owner/OwnerUsersScreen'
import OwnerUserDetailScreen from './pages/owner/OwnerUserDetailScreen'
import OwnerStaffScreen from './pages/owner/OwnerStaffScreen'
import OwnerProductsScreen from './pages/owner/OwnerProductsScreen'
import OwnerProductDetailScreen from './pages/owner/OwnerProductDetailScreen'
import OwnerShiftsScreen from './pages/owner/OwnerShiftsScreen'
import OwnerMembershipScreen from './pages/owner/OwnerMembershipScreen'
import OwnerAlertsScreen from './pages/owner/OwnerAlertsScreen'
import OwnerOrdersScreen from './pages/owner/OwnerOrdersScreen'
import OwnerPromotionsScreen from './pages/owner/OwnerPromotionsScreen'
import OwnerReportsScreen from './pages/owner/OwnerReportsScreen'

import StaffPage from './pages/auth/StaffPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route element={<ProtectedRoute roles={["owner"]} />}>
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OwnerDashboardScreen />} />
          <Route path="users" element={<OwnerUsersScreen />} />
          <Route path="users/:userId" element={<OwnerUserDetailScreen />} />
          <Route path="staff" element={<OwnerStaffScreen />} />
          <Route path="staff-calendar" element={<OwnerShiftsScreen />} />
          <Route path="staff-analytics" element={<OwnerAnalyticsScreen />} />
          <Route path="products" element={<OwnerProductsScreen />} />
          <Route path="products/:productId" element={<OwnerProductDetailScreen />} />
          <Route path="orders" element={<OwnerOrdersScreen />} />
          <Route path="promotions" element={<OwnerPromotionsScreen />} />
          <Route path="membership" element={<OwnerMembershipScreen />} />
          <Route path="alerts" element={<OwnerAlertsScreen />} />
          <Route path="reports" element={<OwnerReportsScreen />} />
          <Route path="analytics" element={<Navigate to="/owner/reports" replace />} />
          <Route path="shifts" element={<Navigate to="/owner/staff-calendar" replace />} />
          <Route path="vouchers" element={<Navigate to="/owner/promotions" replace />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={["staff"]} />}>
        <Route path="/staff/*" element={<StaffPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
