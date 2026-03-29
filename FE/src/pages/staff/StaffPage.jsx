import { useLocation } from 'react-router-dom';
import { useTranslate } from '../../hooks/useTranslate';
import StaffLayout from './StaffLayout';
import StaffDashboard from './StaffDashboard';
import StaffRentOrders from './StaffRentOrders';
import StaffWalkInPage from './StaffWalkInPage';
import StaffShiftRegistration from './StaffShiftRegistration';
import StaffReviewsPage from './StaffReviewsPage';
import BookingPage from './bookings/BookingPage';
import OrdersList from '../../components/owner/OrdersList';

const STAFF_PLACEHOLDER_TITLES = {
  'rent-order': 'staff.createRentOrder',
  'sale-order': 'staff.createSaleOrder',
  shifts: 'staff.shiftRegistration',
  reviews: 'staff.reviewManagement',
  bookings: 'staff.fittingBookings',
  fitting: 'staff.fittingBookings',
  return: 'staff.returns',
};

const StaffPage = () => {
  const { t } = useTranslate();
  const location = useLocation();
  const pathMatch = location.pathname.match(/^\/staff\/([^/]+)/);
  const subPath = pathMatch ? pathMatch[1] : null;
  const isDashboard = !subPath;

  const renderContent = () => {
    if (isDashboard) {
      return <StaffDashboard />;
    }

    if (subPath === 'rent-orders') {
      return <StaffRentOrders />;
    }

    if (subPath === 'walk-in') {
      return <StaffWalkInPage />;
    }

    if (subPath === 'sale-order') {
      return <OrdersList showRentOrders={false} allowSaleStatusUpdate />;
    }

    if (subPath === 'shifts') {
      return <StaffShiftRegistration />;
    }

    if (subPath === 'reviews') {
      return <StaffReviewsPage />;
    }

    if (subPath === 'bookings') {
      return <BookingPage />;
    }

    return (
      <div className="py-20 text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          {t(STAFF_PLACEHOLDER_TITLES[subPath] || '', t('staff.placeholderTitle'))}
        </h2>
        <p className="mb-4 text-gray-600">{t('common.developing')}. {t('common.comeBackLater')}.</p>
        <a href="/staff" className="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700">
          {t('staff.backToDashboard')}
        </a>
      </div>
    );
  };

  return (
    <StaffLayout>
      {renderContent()}
    </StaffLayout>
  );
};

export default StaffPage;
