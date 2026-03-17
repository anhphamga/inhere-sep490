import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from '../pages/public/HomePage'
import BuyPage from '../pages/public/BuyPage'
import BlogPage from '../pages/public/BlogPage'
import BlogDetailPage from '../pages/public/BlogDetailPage'
import BookingPage from '../pages/customer/BookingPage'
import FavoritesPage from '../pages/customer/FavoritesPage'
import ProductDetailPage from '../pages/customer/ProductDetailPage'
import LoginPage from '../pages/auth/LoginPage'
import SignupPage from '../pages/auth/SignupPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import ProfilePage from '../pages/auth/ProfilePage'
import StaffPage from '../pages/staff/StaffPage'
import PrivateRoute from './PrivateRoute'
import OwnerLayout from '../pages/owner/OwnerLayout'
import OwnerAlertsScreen from '../pages/owner/OwnerAlertsScreen'
import OwnerAnalyticsScreen from '../pages/owner/OwnerAnalyticsScreen'
import OwnerDashboardScreen from '../pages/owner/OwnerDashboardScreen'
import OwnerMembershipScreen from '../pages/owner/OwnerMembershipScreen'
import OwnerOrdersScreen from '../pages/owner/OwnerOrdersScreen'
import OwnerProductDetailScreen from '../pages/owner/OwnerProductDetailScreen'
import OwnerProductsScreen from '../pages/owner/OwnerProductsScreen'
import OwnerCategoriesScreen from '../pages/owner/OwnerCategoriesScreen'
import OwnerPromotionsScreen from '../pages/owner/OwnerPromotionsScreen'
import OwnerReportsScreen from '../pages/owner/OwnerReportsScreen'
import OwnerShiftsScreen from '../pages/owner/OwnerShiftsScreen'
import OwnerStaffScreen from '../pages/owner/OwnerStaffScreen'
import OwnerUserDetailScreen from '../pages/owner/OwnerUserDetailScreen'
import OwnerUsersScreen from '../pages/owner/OwnerUsersScreen'
import OwnerInventoryScreen from '../pages/owner/OwnerInventoryScreen'
// Rental pages
import RentalCheckoutPage from '../pages/RentalCheckoutPage'
import RentalHistoryPage from '../pages/RentalHistoryPage'
import RentalDetailPage from '../pages/RentalDetailPage'
import BuyCheckoutPage from '../pages/BuyCheckoutPage'
import CartPage from '../pages/CartPage'

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/buy" element={<BuyPage />} />
            <Route path="/buy/checkout" element={<BuyCheckoutPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:id" element={<BlogDetailPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />

            {/* Rental Routes */}
            <Route path="/rental/checkout" element={<RentalCheckoutPage />} />
            <Route path="/rental/history" element={<RentalHistoryPage />} />
            <Route path="/rental/:id" element={<RentalDetailPage />} />

            <Route element={<PrivateRoute />}>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
            </Route>
            <Route element={<PrivateRoute roles={['owner']} />}>
                <Route path="/owner" element={<OwnerLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<OwnerDashboardScreen />} />
                    <Route path="users" element={<OwnerUsersScreen />} />
                    <Route path="users/:userId" element={<OwnerUserDetailScreen />} />
                    <Route path="products" element={<OwnerProductsScreen />} />
                    <Route path="categories" element={<OwnerCategoriesScreen />} />
                    <Route path="products/:productId" element={<OwnerProductDetailScreen />} />
                    <Route path="inventory" element={<OwnerInventoryScreen />} />
                    <Route path="staff" element={<OwnerStaffScreen />} />
                    <Route path="staff-calendar" element={<OwnerShiftsScreen />} />
                    <Route path="staff-analytics" element={<OwnerAnalyticsScreen />} />
                    <Route path="orders" element={<OwnerOrdersScreen />} />
                    <Route path="promotions" element={<OwnerPromotionsScreen />} />
                    <Route path="membership" element={<OwnerMembershipScreen />} />
                    <Route path="alerts" element={<OwnerAlertsScreen />} />
                    <Route path="reports" element={<OwnerReportsScreen />} />
                </Route>
            </Route>
            <Route element={<PrivateRoute roles={['staff']} />}>
                <Route path="/staff/*" element={<StaffPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default AppRoutes
