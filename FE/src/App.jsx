import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import BuyPage from './pages/BuyPage'
import BookingPage from './pages/BookingPage'
import AdminProductsPage from './pages/AdminProductsPage'
import AdminBlogsPage from './pages/AdminBlogsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ProfilePage from './pages/auth/ProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import SakuraFall from './components/SakuraFall'

function App() {
  return (
    <>
      <SakuraFall count={22} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/buy" element={<BuyPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/admin/products" element={<AdminProductsPage />} />
        <Route path="/admin/blogs" element={<AdminBlogsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
