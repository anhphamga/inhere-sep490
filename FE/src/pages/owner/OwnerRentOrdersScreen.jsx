import OrdersList from '../../components/owner/OrdersList'

const OwnerRentOrdersScreen = () => {
  return <OrdersList fixedOrderType="rent" allowSaleStatusUpdate={false} />
}

export default OwnerRentOrdersScreen
