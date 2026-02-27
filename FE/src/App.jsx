import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import BuyPage from './pages/BuyPage'
import BookingPage from './pages/BookingPage'
import AdminProductsPage from './pages/AdminProductsPage'
import AdminBlogsPage from './pages/AdminBlogsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import SakuraFall from './components/SakuraFall'

function App() {
  return (
    <>
      <SakuraFall count={22} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/buy" element={<BuyPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/admin/products" element={<AdminProductsPage />} />
        <Route path="/admin/blogs" element={<AdminBlogsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
