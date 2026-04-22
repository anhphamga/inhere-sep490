import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getAlertsApi,
  markAlertAsReadApi,
  markAllAlertsAsReadApi,
} from "../../services/alert.service";

const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function StaffLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const resolveAlertTargetType = useCallback(() => {
    const path = String(location.pathname || "");
    if (path.startsWith("/staff/rent-orders") || path.startsWith("/staff/return")) return "RentOrder";
    if (path.startsWith("/staff/sale-order") || path.startsWith("/staff/walk-in")) return "SaleOrder";
    if (path.startsWith("/staff/bookings")) return "FittingBooking";
    return "";
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target)
      ) {
        setNotificationOpen(false);
      }
    };
    if (notificationOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [notificationOpen]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Poll tổng số thông báo chưa đọc (không giới hạn theo targetType) để hiển thị badge
  useEffect(() => {
    let active = true;

    const fetchUnreadCount = async () => {
      try {
        const response = await getAlertsApi({ page: 1, limit: 1, status: "New" });
        if (!active) return;
        const count = Number(response?.unreadCount || 0);
        setUnreadCount(Number.isFinite(count) && count >= 0 ? count : 0);
      } catch {
        if (!active) return;
        // Không ghi đè UI nếu API lỗi — chỉ giữ giá trị trước đó
      }
    };

    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, 60000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!notificationOpen) return;
    let active = true;

    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        setNotificationsError("");
        const targetType = resolveAlertTargetType();
        const response = await getAlertsApi({
          page: 1,
          limit: 8,
          status: "New",
          ...(targetType ? { targetType } : {}),
        });
        if (!active) return;
        setNotifications(Array.isArray(response?.data) ? response.data : []);
        // Cập nhật lại badge khi mở panel (đồng bộ với danh sách vừa tải)
        if (!targetType) {
          const count = Number(response?.unreadCount || 0);
          setUnreadCount(Number.isFinite(count) && count >= 0 ? count : 0);
        }
      } catch (apiError) {
        if (!active) return;
        setNotificationsError(apiError?.response?.data?.message || "Không thể tải thông báo");
        setNotifications([]);
      } finally {
        if (active) setNotificationsLoading(false);
      }
    };

    fetchNotifications();
    return () => {
      active = false;
    };
  }, [notificationOpen, resolveAlertTargetType]);

  const handleLogout = async () => {
    await logout();
    navigate("/work/login?role=staff", { replace: true });
  };

  // Đánh dấu 1 thông báo là đã đọc (optimistic): cập nhật UI trước, rollback nếu API lỗi
  const handleMarkOne = useCallback(async (alertId) => {
    if (!alertId) return;
    let previousNotifications = [];
    let previousCount = 0;
    setNotifications((prev) => {
      previousNotifications = prev;
      return prev.map((item) => (
        item?._id === alertId && item?.status === "New"
          ? { ...item, status: "Seen" }
          : item
      ));
    });
    setUnreadCount((prev) => {
      previousCount = prev;
      return Math.max(0, prev - 1);
    });
    try {
      await markAlertAsReadApi(alertId);
    } catch {
      // Rollback nếu lỗi để tránh lệch trạng thái hiển thị
      setNotifications(previousNotifications);
      setUnreadCount(previousCount);
    }
  }, []);

  // Đánh dấu TẤT CẢ đã đọc (cả những alert không hiện trong dropdown)
  const handleMarkAll = useCallback(async () => {
    let previousNotifications = [];
    let previousCount = 0;
    setNotifications((prev) => {
      previousNotifications = prev;
      return prev.map((item) => (
        item?.status === "New" ? { ...item, status: "Seen" } : item
      ));
    });
    setUnreadCount((prev) => {
      previousCount = prev;
      return 0;
    });
    try {
      await markAllAlertsAsReadApi();
    } catch {
      setNotifications(previousNotifications);
      setUnreadCount(previousCount);
    }
  }, []);

  const sidebarMenu = [
    { to: "/staff", label: "Tổng quan", icon: "DB" },
    { to: "/staff/rent-orders", label: "Đơn thuê", icon: "DT" },
    { to: "/staff/walk-in", label: "Tạo đơn tại chỗ", icon: "WI" },
    { to: "/staff/bookings", label: "Booking thử đồ", icon: "BK" },
    { to: "/staff/blogs", label: "Bài viết blog", icon: "BL" },
    { to: "/staff/reviews", label: "Quản lý đánh giá", icon: "DG" },
    { to: "/staff/sale-order", label: "Đơn bán", icon: "TB" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-5">
          <Link to="/staff" className="text-xl font-bold text-indigo-600 hover:opacity-90">
            INHERE Nhân sự
          </Link>
        </div>

        <nav className="staff-scroll flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {sidebarMenu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-100 text-indigo-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
              end={m.to === "/staff"}
            >
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-indigo-50 px-1 text-[10px] font-bold text-indigo-600">
                {m.icon}
              </span>{" "}
              {m.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-gray-200 p-4">
          <Link
            to="/staff"
            className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-50"
          >
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-gray-100 text-xs font-bold">
              HM
            </span>
            Tổng quan
          </Link>
          <Link
            to="/staff/profile"
            className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-50"
          >
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-gray-100 text-xs font-bold">
              TK
            </span>
            Tài khoản
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-red-600 hover:bg-red-50"
          >
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-red-50 text-xs font-bold">
              OUT
            </span>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-gray-600">NV</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Xin chào, {user?.name || "Nhân viên"}{" "}
                <span className="font-normal text-gray-600">| NHÂN VIÊN</span>
              </h2>
              <p className="text-xs text-gray-500">{formatDate(currentTime)}</p>
            </div>
          </div>

          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationOpen((v) => !v)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-300 hover:bg-indigo-50"
              aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ""}`}
            >
              <span className="text-lg">!</span>
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white shadow ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
                  <div className="font-semibold text-gray-900">Thông báo</div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAll}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      Đánh dấu tất cả đã đọc
                    </button>
                  )}
                </div>

                {notificationsLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">Đang tải thông báo...</div>
                ) : null}

                {notificationsError ? (
                  <div className="px-4 py-3 text-sm text-red-600 text-center">{notificationsError}</div>
                ) : null}

                {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">Không có thông báo mới</div>
                ) : null}

                {!notificationsLoading && !notificationsError && notifications.length > 0 ? (
                  <div className="staff-scroll max-h-80 overflow-y-auto">
                    {notifications.map((item) => {
                      const isUnread = item?.status === "New";
                      return (
                        <button
                          type="button"
                          key={item?._id || `${item?.createdAt}-${item?.message}`}
                          onClick={() => isUnread && handleMarkOne(item?._id)}
                          className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition last:border-0 ${
                            isUnread ? "bg-indigo-50/40 hover:bg-indigo-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={`mt-1 inline-block h-2 w-2 flex-none rounded-full ${
                              isUnread ? "bg-indigo-500" : "bg-transparent"
                            }`}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="mb-1 text-[11px] font-semibold text-gray-500">
                              {item?.type || "Thông báo"}
                            </div>
                            <div className={`text-sm ${isUnread ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                              {item?.message || "Không có nội dung thông báo"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </header>

        <main className="staff-scroll flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
      </div>
    </div>
  );
}


