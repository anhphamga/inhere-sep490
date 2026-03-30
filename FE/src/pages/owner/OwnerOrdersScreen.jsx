import OrdersList from '../../components/owner/OrdersList'

const OwnerOrdersScreen = () => {
    return <OrdersList showRentOrders={false} allowSaleStatusUpdate={false} />
}

export default OwnerOrdersScreen
