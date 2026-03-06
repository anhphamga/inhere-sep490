import { useLocation } from 'react-router-dom'
import StaffLayout from './StaffLayout'
import StaffDashboard from './StaffDashboard'
import StaffRentOrders from './StaffRentOrders'

const STAFF_PLACEHOLDER_TITLES = {
  'rent-order': 'Tạo đơn thuê',
  'sale-order': 'Tạo đơn bán',
  'fitting': 'Lịch thử đồ',
  'return': 'Biên bản trả'
}

const StaffPage = () => {
  const location = useLocation()
  const pathMatch = location.pathname.match(/^\/staff\/([^/]+)/)
  const subPath = pathMatch ? pathMatch[1] : null
  const isDashboard = !subPath

  // Render content based on current route
  const renderContent = () => {
    if (isDashboard) {
      return <StaffDashboard />
    }
    
    if (subPath === 'rent-orders') {
      return <StaffRentOrders />
    }
    
    // Placeholder for other pages
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {STAFF_PLACEHOLDER_TITLES[subPath] || 'Chức năng'}
        </h2>
        <p className="text-gray-600 mb-4">Trang đang phát triển. Vui lòng quay lại sau.</p>
        <a href="/staff" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">
          Về Dashboard
        </a>
      </div>
    )
  }

  return (
    <StaffLayout>
      {renderContent()}
    </StaffLayout>
  )
}

export default StaffPage
