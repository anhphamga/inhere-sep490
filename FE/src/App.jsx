import SakuraFall from './components/common/SakuraFall'
import { useLocation } from 'react-router-dom'
import AppRoutes from './routes'
import { BuyCartProvider } from './contexts/BuyCartContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { RentalCartProvider } from './contexts/RentalCartContext'
import Chatbot from './components/chatbot/Chatbot'
import { useAuth } from './contexts/AuthContext'
import { normalizeRole } from './utils/auth'

function App() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const role = normalizeRole(user?.role)
  const isManagementPath = pathname.startsWith('/owner') || pathname.startsWith('/staff')
  const shouldShowSakura = !isManagementPath
  const shouldShowChatbot = !isManagementPath && role !== 'owner' && role !== 'staff'

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
