import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo/logo.png";

const I18N = {
  vi: {
    hotline: "Hotline",
    cart: "Giỏ hàng",
    navRent: "Thuê trang phục",
    navBuy: "Mua trang phục",
    navBooking: "Đặt lịch thử đồ",
    navBlog: "Blog / Cẩm nang",
    navPromo: "Khuyến mãi",
    navContact: "Liên hệ",
    search: "Tìm trang phục...",
    cta: "ĐẶT LỊCH NGAY",
  },
  en: {
    hotline: "Hotline",
    cart: "Cart",
    navRent: "Rent Outfits",
    navBuy: "Buy Outfits",
    navBooking: "Fitting Booking",
    navBlog: "Blog / Guides",
    navPromo: "Promotions",
    navContact: "Contact",
    search: "Search outfits...",
    cta: "BOOK NOW",
  },
};

export default function Header({ active = "", lang, setLang }) {
  const [innerLang, setInnerLang] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("lang") || "vi" : "vi"
  );

  const currentLang = lang || innerLang;
  const onSetLang = setLang || setInnerLang;
  const t = useMemo(() => I18N[currentLang] || I18N.vi, [currentLang]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lang", currentLang);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = currentLang;
    }
  }, [currentLang]);

  return (
    <header className="site-header">
      <div className="site-shell site-top-row">
        <Link to="/" className="site-brand">
          <img src={logo} alt="INHERE" className="site-logo" />
        </Link>

        <div className="site-top-right">
          <div className="site-lang">
            <button
              type="button"
              className={currentLang === "vi" ? "active" : ""}
              onClick={() => onSetLang("vi")}
            >
              VI
            </button>
            <button
              type="button"
              className={currentLang === "en" ? "active" : ""}
              onClick={() => onSetLang("en")}
            >
              EN
            </button>
          </div>
          <a className="site-pill" href="/#contact">
            • {t.hotline}
          </a>
          <a className="site-pill" href="/#cart">
            🛒 {t.cart}
          </a>
        </div>
      </div>

      <nav className="site-nav">
        <div className="site-shell site-nav-row">
          <div className="site-nav-left">
            <a className="site-nav-link" href="/#rent">
              {t.navRent}
            </a>
            <Link className={`site-nav-link ${active === "buy" ? "active" : ""}`} to="/buy">
              {t.navBuy}
            </Link>
            <Link
              className={`site-nav-link ${active === "booking" ? "active" : ""}`}
              to="/booking"
            >
              {t.navBooking}
            </Link>
            <a className="site-nav-link" href="/#blog">
              {t.navBlog}
            </a>
            <a className="site-nav-link" href="/#promo">
              {t.navPromo}
            </a>
            <a className="site-nav-link" href="/#contact">
              {t.navContact}
            </a>
          </div>
          <div className="site-nav-right">
            <input className="site-search" type="search" placeholder={t.search} />
            <Link to="/booking" className="site-cta">
              {t.cta}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
