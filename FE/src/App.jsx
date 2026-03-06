import SakuraFall from './components/common/SakuraFall'
import AppRoutes from './routes'
import { RentalCartProvider } from './contexts/RentalCartContext'

function App() {
  return (
    <>
      <SakuraFall count={22} />
      <RentalCartProvider>
        <AppRoutes />
      </RentalCartProvider>
    </>
  )
}

export default App
