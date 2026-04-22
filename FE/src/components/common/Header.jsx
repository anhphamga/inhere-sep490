import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Heart, ShoppingCart, User } from "lucide-react";
import logo from "../../assets/logo/logo.png";
import { useBuyCart } from "../../contexts/BuyCartContext";
import { useRentalCart } from "../../contexts/RentalCartContext";
import { useAuth } from "../../hooks/useAuth";
import { getRouteByRole, isDashboardRole } from "../../utils/auth";
import "../../style/components/Header.css";

const LABELS = {
  cart: "Giỏ hàng",
  navHome: "Trang chủ",
  navRent: "Thuê đồ",
  navBuy: "Mua đồ",
  navCollection: "Bộ sưu tập",
  navBlog: "Blog",
  navContact: "Liên hệ",
  search: "Tìm trang phục...",
  cta: "ĐẶT LỊCH NGAY",
  login: "Đăng nhập",
  orderHistory: "Lịch sử đơn hàng",
  vouchers: "Voucher của tôi",
  favorites: "Sản phẩm yêu thích",
  profile: "Tài khoản",
  logout: "Đăng xuất",
  dashboard: "Bảng điều khiển",
};

const RENT_MEGA_MENU = [
  {
    title: "Danh mục thuê",
    items: [
      { label: "Áo dài truyền thống", to: "/buy?purpose=rent&category=ao-dai-cho-thue" },
      { label: "Cổ phục", to: "/buy?purpose=rent&category=co-phuc" },
      { label: "Phụ kiện chụp ảnh cho thuê", to: "/buy?purpose=rent&category=phu-kien-chup-anh-cho-thue" },
    ],
  },
  {
    title: "Dịch vụ thuê",
    items: [
      { label: "Đặt lịch thử đồ", to: "/buy?purpose=rent&openBooking=1" },
      { label: "Tư vấn chọn trang phục", to: "/buy?purpose=rent&openChatbot=1" },
    ],
  },
  {
    title: "Khám phá nhanh",
    items: [
      { label: "Sản phẩm nổi bật", to: "/buy?purpose=rent&sort=top_liked" },
      { label: "Ưu đãi hiện tại", to: "/my-vouchers" },
      { label: "Hướng dẫn khách du lịch", to: "/blog" },
    ],
  },
];

export default function Header({ active = "" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount } = useRentalCart() || { itemCount: 0 };
  const { itemCount: buyItemCount } = useBuyCart() || { itemCount: 0 };
  const { isAuthenticated, logout, user } = useAuth();
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const dashboardPath = getRouteByRole(user?.role);
  const totalCartCount = Number(itemCount || 0) + Number(buyItemCount || 0);
  const cartPath = "/cart";
  const isCustomer = isAuthenticated && !isDashboardRole(user?.role);
  const customerNotifications = [
    { id: "n1", text: "Theo dõi đơn hàng ở mục Lịch sử đơn hàng." },
    { id: "n2", text: "Bạn có thể lưu trang phục ở mục Yêu thích để đặt nhanh." },
  ];

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = "vi";
    }
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
      if (!notificationRef.current?.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchValue(params.get("q") || "");
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const keyword = searchValue.trim();
    const params = new URLSearchParams();
    const currentParams = new URLSearchParams(location.search);
    const currentPurpose = String(currentParams.get("purpose") || "").trim().toLowerCase();

    if (currentPurpose === "rent" || active === "rent") {
      params.set("purpose", "rent");
    }

    if (keyword) params.set("q", keyword);
    navigate({
      pathname: "/buy",
      search: params.toString() ? `?${params.toString()}` : "",
    });
  };

  return (
    <header className="site-header">
      <div className="site-shell site-top-row">
        <Link to="/" className="site-brand" aria-label="INHERE">
          <img src={logo} alt="INHERE" className="site-logo" />
        </Link>

        <div className="site-top-right">
          <Link
            to={cartPath}
            className={`site-icon-btn ${totalCartCount > 0 ? "site-pill-accent" : ""}`}
            title={LABELS.cart}
            aria-label={LABELS.cart}
          >
            <ShoppingCart size={18} />
            {totalCartCount > 0 && <span className="site-pill-count">{totalCartCount}</span>}
          </Link>

          {isCustomer ? (
            <div className="site-account" ref={notificationRef}>
              <button
                type="button"
                className="site-account-trigger"
                onClick={() => setNotificationOpen((prev) => !prev)}
                aria-label="Thông báo"
              >
                <Bell size={18} />
              </button>

              {notificationOpen && (
                <div className="site-account-menu">
                  <div className="site-account-item"><strong>Thông báo</strong></div>
                  {customerNotifications.map((item) => (
                    <div key={item.id} className="site-account-item">{item.text}</div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {isAuthenticated ? (
            <div className="site-account" ref={menuRef}>
              <button
                type="button"
                className="site-account-trigger"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label={LABELS.profile}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="site-account-avatar" />
                ) : (
                  <span className="site-account-fallback">
                    <User size={18} />
                  </span>
                )}
              </button>

              {menuOpen && (
                <div className="site-account-menu">
                  {isDashboardRole(user?.role) && (
                    <Link
                      to={dashboardPath}
                      className="site-account-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      {LABELS.dashboard}
                    </Link>
                  )}
                  <Link to="/orders/history" className="site-account-item" onClick={() => setMenuOpen(false)}>
                    {LABELS.orderHistory}
                  </Link>
                  <Link to="/my-vouchers" className="site-account-item" onClick={() => setMenuOpen(false)}>
                    {LABELS.vouchers}
                  </Link>
                  <Link to="/favorites" className="site-account-item" onClick={() => setMenuOpen(false)}>
                    {LABELS.favorites}
                  </Link>
                  <Link to="/profile" className="site-account-item" onClick={() => setMenuOpen(false)}>
                    {LABELS.profile}
                  </Link>
                  <button
                    type="button"
                    className="site-account-item site-account-danger"
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                      navigate("/", { replace: true });
                    }}
                  >
                    {LABELS.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/track-order" className="site-pill" title="Tra cứu đơn thuê (khách không đăng nhập)">
                Tra cứu đơn
              </Link>
              <Link to="/login" className="site-pill">
                {LABELS.login}
              </Link>
            </div>
          )}
        </div>
      </div>

      <nav className="site-nav">
        <div className="site-shell site-nav-row">
          <div className="site-nav-left">
            <Link className={`site-nav-link ${active === "home" ? "active" : ""}`} to="/">
              {LABELS.navHome}
            </Link>

            <div className="site-nav-item site-nav-mega">
              <button
                type="button"
                className={`site-nav-link site-nav-link-button ${active === "rent" ? "active" : ""}`}
                aria-haspopup="true"
              >
                {LABELS.navRent}
              </button>
              <div className="site-mega-menu" role="menu" aria-label={LABELS.navRent}>
                <div className="site-mega-grid">
                  {RENT_MEGA_MENU.map((group) => (
                    <div key={group.title} className="site-mega-col">
                      <p className="site-mega-title">{group.title}</p>
                      <div className="site-mega-links">
                        {group.items.map((item) => (
                          <Link key={item.label} to={item.to} className="site-mega-link">
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Link className={`site-nav-link ${active === "buy" ? "active" : ""}`} to="/buy">
              {LABELS.navBuy}
            </Link>

            <Link
              className={`site-nav-link ${active === "collection" ? "active" : ""}`}
              to="/collections"
            >
              {LABELS.navCollection}
            </Link>

            <Link className={`site-nav-link ${active === "blog" ? "active" : ""}`} to="/blog">
              {LABELS.navBlog}
            </Link>

            <Link
              className={`site-nav-link ${active === "contact" ? "active" : ""}`}
              to="/contact"
            >
              {LABELS.navContact}
            </Link>
          </div>

          <div className="site-nav-right">
            <form onSubmit={handleSearchSubmit}>
              <input
                className="site-search"
                type="search"
                placeholder={LABELS.search}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </form>
            <Link to="/buy?purpose=rent&openBooking=1" className="site-cta">
              {LABELS.cta}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
