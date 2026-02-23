import { useNavigate, useParams } from 'react-router-dom'
import ProductDetail from './ProductDetail'

const OwnerProductDetailScreen = () => {
    const { productId } = useParams()
    const navigate = useNavigate()

    return <ProductDetail productId={productId} onBack={() => navigate('/owner/products')} />
}

export default OwnerProductDetailScreen
