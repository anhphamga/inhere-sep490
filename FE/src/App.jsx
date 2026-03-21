import SakuraFall from './components/common/SakuraFall'
import AppRoutes from './routes'
import { BuyCartProvider } from './contexts/BuyCartContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { RentalCartProvider } from './contexts/RentalCartContext'
import Chatbot from './components/chatbot/Chatbot'

function App() {
  return (
    <>
      <SakuraFall count={22} />
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
