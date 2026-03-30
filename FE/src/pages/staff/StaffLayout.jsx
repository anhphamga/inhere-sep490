import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef(null);

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

  const handleLogout = async () => {
    await logout();
    navigate("/work/login?role=staff", { replace: true });
  };

  const sidebarMenu = [
    { to: "/staff", label: "Tổng quan", icon: "DB" },
    { to: "/staff/shifts", label: "Đăng ký ca làm", icon: "CL" },
    { to: "/staff/rent-orders", label: "Đơn thuê", icon: "DT" },
    { to: "/staff/walk-in", label: "Tạo đơn tại chỗ", icon: "WI" },
    { to: "/staff/bookings", label: "Booking thử đồ", icon: "BK" },
    { to: "/staff/reviews", label: "Quản lý đánh giá", icon: "DG" },
    { to: "/staff/sale-order", label: "Đơn bán", icon: "TB" },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-5">
          <h1 className="text-xl font-bold text-indigo-600">INHERE Nhân sự</h1>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
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
            to="/profile"
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

      <div className="flex flex-1 flex-col">
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

          <button
            ref={notificationRef}
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-300 hover:bg-indigo-50"
          >
            <span className="text-lg">!</span>
            
            {notificationOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
               <div className="border-b border-gray-200 p-4 font-semibold">Thông báo</div>
               <div className="px-4 py-3 text-sm text-gray-500 text-center">Không có thông báo mới</div>
              </div>
            )}
          </button>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-8">{children}</main>
      </div>
    </div>
  );
}
