import SakuraFall from './components/common/SakuraFall'
import { useLocation } from 'react-router-dom'
import AppRoutes from './routes'
import { BuyCartProvider } from './contexts/BuyCartContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { RentalCartProvider } from './contexts/RentalCartContext'
import Chatbot from './components/chatbot/Chatbot'

function App() {
  const { pathname } = useLocation()
  const isOwnerManagement = pathname.startsWith('/owner')
  const isStaffManagement = pathname.startsWith('/staff')
  const shouldShowSakura = !isOwnerManagement && !isStaffManagement

  return (
    <>
      {shouldShowSakura && <SakuraFall count={22} />}
      <RentalCartProvider>
        <BuyCartProvider>
          <FavoritesProvider>
            <AppRoutes />
            <Chatbot />
          </FavoritesProvider>
        </BuyCartProvider>
      </RentalCartProvider>
    </>
  )
}

export default App
