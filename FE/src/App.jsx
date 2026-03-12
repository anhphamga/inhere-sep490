import SakuraFall from './components/common/SakuraFall'
import AppRoutes from './routes'
import { BuyCartProvider } from './contexts/BuyCartContext'
import { RentalCartProvider } from './contexts/RentalCartContext'

function App() {
  return (
    <>
      <SakuraFall count={22} />
      <RentalCartProvider>
        <BuyCartProvider>
          <AppRoutes />
        </BuyCartProvider>
      </RentalCartProvider>
    </>
  )
}

export default App
