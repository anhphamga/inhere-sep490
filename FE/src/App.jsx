import SakuraFall from './components/common/SakuraFall'
import { useLocation } from 'react-router-dom'
import AppRoutes from './routes'
import { BuyCartProvider } from './contexts/BuyCartContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { RentalCartProvider } from './contexts/RentalCartContext'
import Chatbot from './components/chatbot/Chatbot'
import { useAuth } from './contexts/AuthContext'
import { normalizeRole } from './utils/auth'
import { useLocation } from 'react-router-dom'

function App() {
  const { pathname } = useLocation()
  const isOwnerManagement = pathname.startsWith('/owner')
  const isStaffManagement = pathname.startsWith('/staff')
  const shouldShowSakura = !isOwnerManagement && !isStaffManagement
  const { user } = useAuth()
  const location = useLocation()
  const role = normalizeRole(user?.role)
  const isDashboardPath = location.pathname.startsWith('/owner') || location.pathname.startsWith('/staff')
  const shouldShowChatbot = !isDashboardPath && role !== 'owner' && role !== 'staff'

  return (
    <>
      {shouldShowSakura && <SakuraFall count={22} />}
      <RentalCartProvider>
        <BuyCartProvider>
          <FavoritesProvider>
            <AppRoutes />
            {shouldShowChatbot && <Chatbot />}
          </FavoritesProvider>
        </BuyCartProvider>
      </RentalCartProvider>
    </>
  )
}

export default App
