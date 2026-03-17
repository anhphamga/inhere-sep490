import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, User } from "lucide-react";
import logo from "../../assets/logo/logo.png";
import { useBuyCart } from "../../contexts/BuyCartContext";
import { useRentalCart } from "../../contexts/RentalCartContext";
import { useAuth } from "../../hooks/useAuth";
import { getRouteByRole } from "../../utils/auth";
import "../../style/components/Header.css";

const LABELS = {
  cart: "Giỏ hàng",
  navRent: "Trang chủ",
  navBuy: "Mua trang phục",
  navBooking: "Đặt lịch thử đồ",
  navBlog: "Blog / Cẩm nang",
  search: "Tìm trang phục...",
  cta: "ĐẶT LỊCH NGAY",
  login: "Đăng nhập",
  orderHistory: "Lịch sử đơn hàng",
  favorites: "Sản phẩm yêu thích",
  profile: "Tài khoản",
  logout: "Đăng xuất",
  dashboard: "Bảng điều khiển",
};

export default function Header({ active = "", onSectionNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount } = useRentalCart() || { itemCount: 0 };
  const { itemCount: buyItemCount } = useBuyCart() || { itemCount: 0 };
  const { isAuthenticated, logout, user } = useAuth();
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const isHomePage = location.pathname === "/";
  const dashboardPath = getRouteByRole(user?.role);
  const totalCartCount = Number(itemCount || 0) + Number(buyItemCount || 0);
  const cartPath = "/cart";

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

  const getSectionHref = (section) => (isHomePage ? `#${section}` : `/#${section}`);

  const handleSectionClick = (event, section) => {
    if (!isHomePage || !onSectionNavigate) {
      return;
    }

    event.preventDefault();
    onSectionNavigate(section);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const keyword = searchValue.trim();
    const params = new URLSearchParams();
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
                  {(user?.role === "owner" || user?.role === "staff") && (
                    <Link
                      to={dashboardPath}
                      className="site-account-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      {LABELS.dashboard}
                    </Link>
                  )}
                  <Link to="/rental/history" className="site-account-item" onClick={() => setMenuOpen(false)}>
                    {LABELS.orderHistory}
                  </Link>
                  <Link to="/favorites" className="site-account-item" onClick={() => setMenuOpen(false)}>
                    <Heart size={16} />
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
            <Link to="/login" className="site-pill">
              {LABELS.login}
            </Link>
          )}
        </div>
      </div>

      <nav className="site-nav">
        <div className="site-shell site-nav-row">
          <div className="site-nav-left">
            <a
              className={`site-nav-link ${active === "rent" ? "active" : ""}`}
              href={getSectionHref("rent")}
              onClick={(e) => handleSectionClick(e, "rent")}
            >
              {LABELS.navRent}
            </a>
            <Link className={`site-nav-link ${active === "buy" ? "active" : ""}`} to="/buy">
              {LABELS.navBuy}
            </Link>
            <Link className={`site-nav-link ${active === "booking" ? "active" : ""}`} to="/booking">
              {LABELS.navBooking}
            </Link>
            <Link
              className={`site-nav-link ${active === "blog" ? "active" : ""}`}
              to="/blog"
            >
              {LABELS.navBlog}
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
            <Link to="/booking" className="site-cta">
              {LABELS.cta}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
