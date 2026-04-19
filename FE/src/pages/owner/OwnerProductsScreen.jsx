import ProductsList from '../../components/owner/ProductsList'
import { useLocation, useNavigate } from 'react-router-dom'

const OwnerProductsScreen = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const initialPage = Math.max(1, Number(location.state?.page) || 1)

    return (
        <ProductsList
            initialPage={initialPage}
            onSelectProduct={(id, context) => navigate(`/owner/products/${id}`, {
                state: {
                    returnTo: `/owner/products${location.search || ''}`,
                    page: Math.max(1, Number(context?.page) || 1)
                }
            })}
        />
    )
}

export default OwnerProductsScreen
