import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslate } from '../../hooks/useTranslate';
import StaffLayout from './StaffLayout';
import StaffDashboard from './StaffDashboard';
import StaffRentOrders from './StaffRentOrders';
import StaffWalkInPage from './StaffWalkInPage';
import StaffReviewsPage from './StaffReviewsPage';
import StaffBlogsPage from './StaffBlogsPage';
import BookingPage from './bookings/BookingPage';
import OrdersList from '../../components/owner/OrdersList';
import ProfilePage from '../auth/ProfilePage';
import StaffSchedulesPage from './StaffSchedulesPage';
import { getCurrentShift } from '../../api/shiftScheduleApi';

const STAFF_PLACEHOLDER_TITLES = {
  'rent-order': 'staff.createRentOrder',
  'sale-order': 'staff.createSaleOrder',
  reviews: 'staff.reviewManagement',
  blogs: 'Quản lý bài viết',
  bookings: 'staff.fittingBookings',
  fitting: 'staff.fittingBookings',
  return: 'staff.returns',
  schedules: 'Lịch làm',
};

const StaffPage = () => {
  const { t } = useTranslate();
  const location = useLocation();
  const pathMatch = location.pathname.match(/^\/staff\/([^/]+)/);
  const subPath = pathMatch ? pathMatch[1] : null;
  const isDashboard = !subPath;

  const requiresActiveShift = useMemo(() => {
    if (isDashboard) return true;
    return ['rent-orders', 'walk-in', 'sale-order', 'return', 'reviews', 'blogs', 'bookings', 'fitting'].includes(String(subPath || ''));
  }, [isDashboard, subPath]);

  const [shiftChecking, setShiftChecking] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchCurrentShift = async () => {
      if (!requiresActiveShift) {
        return;
      }

      try {
        setShiftChecking(true);
        const res = await getCurrentShift();
        const payload = res?.data;
        const data = payload?.data ?? null;
        if (!active) return;
        setCurrentShift(data);
      } catch {
        if (!active) return;
        setCurrentShift(null);
      } finally {
        if (active) setShiftChecking(false);
      }
    };

    fetchCurrentShift();
    return () => {
      active = false;
    };
  }, [location.pathname, requiresActiveShift]);

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

    if (subPath === 'schedules') {
      return <StaffSchedulesPage />;
    }

    if (subPath === 'reviews') {
      return <StaffReviewsPage />;
    }

    if (subPath === 'bookings') {
      return <BookingPage />;
    }

    if (subPath === 'blogs') {
      return <StaffBlogsPage pathName={location.pathname} />;
    }

    if (subPath === 'profile') {
      return <ProfilePage embedded backPath="/staff" logoutRedirect="/work/login?role=staff" />;
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
      {requiresActiveShift && shiftChecking ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-700">
          Đang kiểm tra ca làm hiện tại...
        </div>
      ) : requiresActiveShift && !currentShift?.shift ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <h2 className="text-xl font-bold text-rose-800">Bạn chưa có ca làm đang hoạt động</h2>
          <p className="mt-2 text-sm font-medium text-rose-700">
            Bạn cần đang trong ca làm (đã check-in và chưa check-out) để sử dụng chức năng này.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              to="/staff/schedules"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Đi đến lịch làm để check-in
            </Link>
            <Link
              to="/staff"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Quay lại
            </Link>
          </div>
        </div>
      ) : (
        renderContent()
      )}
    </StaffLayout>
  );
};

export default StaffPage;
