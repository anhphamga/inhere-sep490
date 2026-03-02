import ProductsList from './ProductsList'
import { useNavigate } from 'react-router-dom'

const OwnerProductsScreen = () => {
    const navigate = useNavigate()

    return <ProductsList onSelectProduct={(id) => navigate(`/owner/products/${id}`)} />
}

export default OwnerProductsScreen
