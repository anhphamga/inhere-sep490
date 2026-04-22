import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ProductDetail from '../../components/owner/ProductDetail'

const OwnerProductDetailScreen = () => {
    const { productId } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const returnTo = location.state?.returnTo || '/owner/products'
    const returnPage = Math.max(1, Number(location.state?.page) || 1)

    const handleBackToList = () => {
        navigate(returnTo, { state: { page: returnPage } })
    }

    return <ProductDetail productId={productId} onBack={handleBackToList} onSaved={handleBackToList} />
}

export default OwnerProductDetailScreen
