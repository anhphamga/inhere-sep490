import React, { useEffect, useState } from "react";

const I18N = {
  vi: {
    "brand.name": "INHERE",
    "meta.title": "INHERE – Thuê & Mua Trang Phục Hội An",
    "meta.desc":
      "INHERE chuyên thuê & mua trang phục Hội An: áo dài, Việt phục, Nhật Bình, phụ kiện, combo chụp ảnh, đặt lịch thử đồ.",
    "header.hotline": "Hotline",
    "header.cart": "Giỏ hàng",

    "nav.rent": "Thuê trang phục",
    "nav.buy": "Mua trang phục",
    "nav.booking": "Đặt lịch thử đồ",
    "nav.packages": "Combo chụp ảnh",
    "nav.blog": "Blog / Cẩm nang",
    "nav.promo": "Khuyến mãi",
    "nav.contact": "Liên hệ",

    "search.placeholder": "Tìm trang phục...",
    "cta.bookNow": "ĐẶT LỊCH NGAY",

    "hero.badge": "Trang phục Hội An",
    "hero.h1_1": "Thuê trang phục Hội An – mặc đẹp trong 5 phút",
    "hero.sub_1": "Có sẵn phụ kiện • Hỗ trợ phối đồ • Đặt lịch online",
    "hero.h1_2": "Combo gia đình – đủ size, đủ phụ kiện",
    "hero.sub_2":
      "Tư vấn phối đồ theo nhóm • Tạo dáng nhẹ nhàng • Phù hợp du khách",
    "hero.h1_3": "Mua trang phục – có sẵn & may theo số đo",
    "hero.sub_3": "Chất liệu thoải mái • Phom tôn dáng • Giao hàng nhanh",
    "hero.btn_rent": "Thuê ngay",
    "hero.btn_view": "Xem bộ sưu tập",
    "hero.btn_packages": "Xem combo",
    "hero.btn_booking": "Đặt lịch",
    "hero.btn_buy": "Mua ngay",
    "hero.btn_contact": "Liên hệ tư vấn",
    "hero.panel_title": "Điểm nổi bật",
    "hero.panel_1": "Set đồ sẵn – đến là mặc",
    "hero.panel_2": "Nhiều size – hỗ trợ đổi size",
    "hero.panel_3": "Combo chụp ảnh – phụ kiện đầy đủ",

    "policy.title": "Nguyên tắc thuê & mua tại INHERE",
    "policy.sub": "Minh bạch – rõ ràng – thân thiện với du khách",
    "policy.c1.t": "Đặt cọc 50% để giữ đồ",
    "policy.c1.d":
      "Đặt online để giữ lịch & set trang phục theo yêu cầu.",
    "policy.c2.t": "Nhận đồ thanh toán phần còn lại",
    "policy.c2.d": "Thanh toán 50% còn lại khi pick-up.",
    "policy.c3.t": "Thế chân linh hoạt",
    "policy.c3.d":
      "CCCD/GPLX/Cavet hoặc tiền thế chân theo quy định.",
    "policy.c4.t": "Trễ hạn có phụ thu",
    "policy.c4.d": "Trễ ≥ 3 ngày tính phí theo quy định.",
    "policy.c5.t": "Hư/mất cần bồi thường",
    "policy.c5.d": "Theo mức độ & giá trị trang phục.",
    "policy.c6.t": "Hỗ trợ đổi size",
    "policy.c6.d":
      "Đổi theo kho còn, ưu tiên khách đặt lịch.",

    "cat.title": "Danh mục nổi bật",
    "cat.sub":
      "Chọn nhanh outfit phù hợp để chụp phố cổ – đơn giản & đẹp.",
    "cat.t1": "Áo dài nữ",
    "cat.t2": "Việt phục / Nhật Bình",
    "cat.t3": "Combo đôi / gia đình",
    "cat.cta": "Xem thêm",

    "rent.title": "Trang phục thuê được yêu thích",
    "rent.more": "Xem tất cả",
    "rent.p1.n": "Áo dài cổ điển (Full set)",
    "rent.p1.m": "Giá thuê theo ngày • Size S–XL",
    "rent.p2.n": "Việt phục (Kèm phụ kiện)",
    "rent.p2.m": "Set chụp phố cổ • Tư vấn phối đồ",
    "rent.p3.n": "Nhật Bình (Sang trọng)",
    "rent.p3.m": "Phù hợp concept cổ phục",
    "rent.p4.n": "Trang phục nam (Phố cổ)",
    "rent.p4.m": "Gọn gàng • Lịch sự • Dễ chụp",

    "buy.title": "Sản phẩm mua nổi bật",
    "buy.more": "Xem tất cả",
    "buy.p1.n": "Áo dài may sẵn",
    "buy.p1.m": "Chất liệu nhẹ • Form tôn dáng",
    "buy.p2.n": "Việt phục may đo",
    "buy.p2.m": "Tư vấn số đo • Hoàn thiện chuẩn",
    "buy.p3.n": "Phụ kiện chụp ảnh",
    "buy.p3.m": "Nón • Quạt • Túi • Trang sức",
    "buy.p4.n": "Set đôi / gia đình",
    "buy.p4.m": "Nhiều lựa chọn màu sắc",

    "btn.rent": "Thuê ngay",
    "btn.buy": "Mua ngay",
    "btn.detail": "Xem chi tiết",

    "booking.title": "Đặt lịch thử đồ trước khi đến Hội An",
    "booking.sub":
      "Chọn khung giờ – chọn outfit – đến là mặc. Nhân viên hỗ trợ phối đồ & phụ kiện.",
    "booking.guests": "Số người",
    "booking.btn": "Đặt lịch",

    "packages.title": "Combo dịch vụ",
    "packages.sub":
      "Chọn combo phù hợp để tiết kiệm thời gian & chi phí chụp ảnh.",
    "packages.c1.t": "Thuê đồ + phụ kiện",
    "packages.c1.b1": "Full set phụ kiện cơ bản",
    "packages.c1.b2": "Tư vấn phối đồ theo concept",
    "packages.c1.b3": "Nhận đồ nhanh – gọn",
    "packages.c2.t": "Thuê đồ + trang điểm",
    "packages.c2.b1": "Makeup nhẹ nhàng, tự nhiên",
    "packages.c2.b2": "Phù hợp phố cổ & chụp ngoại cảnh",
    "packages.c2.b3": "Tiết kiệm thời gian chuẩn bị",
    "packages.c3.t": "Thuê đồ + chụp ảnh",
    "packages.c3.b1": "Gợi ý góc chụp đẹp",
    "packages.c3.b2": "Hỗ trợ tạo dáng cơ bản",
    "packages.c3.b3": "Phù hợp nhóm bạn / gia đình",

    "reviews.title": "Khách hàng nói gì về INHERE",
    "reviews.sub":
      "Một vài phản hồi tiêu biểu từ khách du lịch & khách địa phương.",
    "reviews.r1":
      "“Đến là có set đồ vừa size, phụ kiện đầy đủ. Chụp phố cổ cực đẹp!”",
    "reviews.r2":
      "“Nhân viên tư vấn nhiệt tình, hướng dẫn tạo dáng nhẹ nhàng.”",
    "reviews.r3":
      "“Combo gia đình rất tiện, tiết kiệm thời gian và chi phí.”",

    "blog.title": "Blog & Cẩm nang Hội An",
    "blog.sub":
      "Mẹo chọn trang phục, bảng size và lịch trình chụp ảnh phố cổ.",
    "blog.p1.t": "Chọn áo dài chụp phố cổ sao cho đẹp",
    "blog.p1.d":
      "Gợi ý màu sắc, phụ kiện và khung giờ chụp hợp nhất.",
    "blog.p2.t":
      "Bảng size chuẩn – chọn nhanh không lo lệch",
    "blog.p2.d":
      "Hướng dẫn đo cơ bản để đặt lịch thử đồ dễ hơn.",
    "blog.p3.t":
      "5 góc chụp phố cổ Hội An “lên hình” đẹp nhất",
    "blog.p3.d":
      "Lộ trình gợi ý để chụp đẹp mà không quá mệt.",

    "promo.title": "Khuyến mãi",
    "promo.sub":
      "Theo dõi chương trình ưu đãi theo mùa – đặt lịch online để giữ ưu đãi.",

    "contact.title": "Liên hệ",
    "contact.sub":
      "Gọi hoặc nhắn Zalo để được tư vấn outfit & lịch chụp phù hợp.",

    "footer.about":
      "Bởi vì ăn mặc là một cách sống. Thuê & mua trang phục Hội An – nhanh, đẹp, thân thiện.",
    "footer.col1": "Danh mục",
    "footer.col2": "Chính sách",
    "footer.col3": "Liên hệ",
    "footer.addr": "Hội An, Quảng Nam",
    "footer.phone": "Hotline:",
  },

  en: {
    "brand.name": "INHERE",
    "meta.title": "INHERE – Rent & Buy Hoi An Outfits",
    "meta.desc":
      "INHERE offers Hoi An outfit rentals and purchases: Ao Dai, Viet attire, Nhat Binh, accessories, photo packages, fitting appointments.",
    "header.hotline": "Hotline",
    "header.cart": "Cart",

    "nav.rent": "Rent Outfits",
    "nav.buy": "Buy Outfits",
    "nav.booking": "Fitting Appointment",
    "nav.packages": "Photo Packages",
    "nav.blog": "Blog / Guides",
    "nav.promo": "Promotions",
    "nav.contact": "Contact",

    "search.placeholder": "Search outfits...",
    "cta.bookNow": "BOOK NOW",

    "hero.badge": "Hoi An Outfits",
    "hero.h1_1": "Rent Hoi An Outfits — Ready in 5 Minutes",
    "hero.sub_1":
      "Accessories included • Styling support • Online booking",
    "hero.h1_2": "Family Sets — All Sizes, Full Accessories",
    "hero.sub_2":
      "Group styling tips • Easy posing support • Tourist-friendly",
    "hero.h1_3": "Buy Outfits — Ready-to-wear & Tailor-made",
    "hero.sub_3":
      "Comfortable fabrics • Flattering fit • Fast delivery",
    "hero.btn_rent": "Rent now",
    "hero.btn_view": "View collection",
    "hero.btn_packages": "View packages",
    "hero.btn_booking": "Book",
    "hero.btn_buy": "Buy now",
    "hero.btn_contact": "Contact us",
    "hero.panel_title": "Highlights",
    "hero.panel_1": "Ready sets — arrive & dress",
    "hero.panel_2": "Multiple sizes — easy exchanges",
    "hero.panel_3": "Photo packages — full accessories",

    "policy.title": "Rental & Purchase Policies at INHERE",
    "policy.sub": "Clear — Transparent — Tourist-friendly",
    "policy.c1.t": "50% deposit to reserve",
    "policy.c1.d":
      "Reserve your time slot and outfit set online.",
    "policy.c2.t": "Pay remaining balance at pickup",
    "policy.c2.d": "Pay the remaining 50% when you pick up.",
    "policy.c3.t": "Flexible collateral options",
    "policy.c3.d":
      "ID/License/Vehicle papers or cash collateral (policy-based).",
    "policy.c4.t": "Late returns incur fees",
    "policy.c4.d": "Late ≥ 3 days will be charged per policy.",
    "policy.c5.t": "Damage/Loss compensation",
    "policy.c5.d": "Based on condition and item value.",
    "policy.c6.t": "Size exchange support",
    "policy.c6.d":
      "Subject to availability; booking customers prioritized.",

    "cat.title": "Featured Categories",
    "cat.sub":
      "Quick picks for Old Town photos — simple and beautiful.",
    "cat.t1": "Women’s Ao Dai",
    "cat.t2": "Viet Attire / Nhat Binh",
    "cat.t3": "Couple / Family Sets",
    "cat.cta": "Explore",

    "rent.title": "Popular Rentals",
    "rent.more": "View all",
    "rent.p1.n": "Classic Ao Dai (Full set)",
    "rent.p1.m": "Daily rental • Sizes S–XL",
    "rent.p2.n": "Viet Attire (Accessories included)",
    "rent.p2.m": "Old Town photo set • Styling support",
    "rent.p3.n": "Nhat Binh (Elegant)",
    "rent.p3.m": "Perfect for traditional concepts",
    "rent.p4.n": "Men’s Outfit (Old Town)",
    "rent.p4.m": "Neat • Polite • Photo-friendly",

    "buy.title": "Featured for Purchase",
    "buy.more": "View all",
    "buy.p1.n": "Ready-to-wear Ao Dai",
    "buy.p1.m": "Light fabric • Flattering fit",
    "buy.p2.n": "Tailor-made Viet Attire",
    "buy.p2.m": "Measurements guidance • Quality finishing",
    "buy.p3.n": "Photo accessories",
    "buy.p3.m": "Hats • Fans • Bags • Jewelry",
    "buy.p4.n": "Couple / Family set",
    "buy.p4.m": "Multiple colors available",

    "btn.rent": "Rent now",
    "btn.buy": "Buy now",
    "btn.detail": "Details",

    "booking.title":
      "Book a fitting before you arrive in Hoi An",
    "booking.sub":
      "Pick a time — choose outfits — arrive and dress. Staff will help with styling & accessories.",
    "booking.guests": "Guests",
    "booking.btn": "Book",

    "packages.title": "Service Packages",
    "packages.sub":
      "Pick a package to save time and cost for your photos.",
    "packages.c1.t": "Outfit + accessories",
    "packages.c1.b1": "Basic accessory set included",
    "packages.c1.b2": "Concept-based styling tips",
    "packages.c1.b3": "Fast pickup process",
    "packages.c2.t": "Outfit + makeup",
    "packages.c2.b1": "Natural, light makeup",
    "packages.c2.b2": "Great for Old Town photos",
    "packages.c2.b3": "Save preparation time",
    "packages.c3.t": "Outfit + photoshoot",
    "packages.c3.b1": "Suggested photo spots",
    "packages.c3.b2": "Basic posing guidance",
    "packages.c3.b3": "Great for friends/family",

    "reviews.title": "What Customers Say",
    "reviews.sub":
      "A few highlight reviews from tourists and locals.",
    "reviews.r1":
      "“Perfect size set ready, full accessories. Old Town photos look amazing!”",
    "reviews.r2":
      "“Very helpful staff — gentle posing guidance and great styling tips.”",
    "reviews.r3":
      "“Family package was super convenient and cost-effective.”",

    "blog.title": "Blog & Hoi An Guides",
    "blog.sub":
      "Outfit tips, sizing guide, and Old Town photo itineraries.",
    "blog.p1.t":
      "How to choose Ao Dai for Old Town photos",
    "blog.p1.d":
      "Color, accessories, and best time slots for photos.",
    "blog.p2.t": "Size guide — choose confidently",
    "blog.p2.d":
      "Simple measurements to make booking easier.",
    "blog.p3.t":
      "5 best Old Town photo spots in Hoi An",
    "blog.p3.d":
      "A suggested route for beautiful photos without exhaustion.",

    "promo.title": "Promotions",
    "promo.sub":
      "Seasonal deals — book online to lock in promotions.",

    "contact.title": "Contact",
    "contact.sub":
      "Call or message via Zalo for outfit styling and photo schedule advice.",

    "footer.about":
      "Because dressing is a way of life. Rent & buy Hoi An outfits — fast, beautiful, friendly.",
    "footer.col1": "Categories",
    "footer.col2": "Policies",
    "footer.col3": "Contact",
    "footer.addr": "Hoi An, Quang Nam",
    "footer.phone": "Hotline:",
  },
};

function t(lang, key) {
  return I18N[lang] && I18N[lang][key]
    ? I18N[lang][key]
    : key;
}

const year = new Date().getFullYear();

const Homepage = () => {
  const [lang, setLang] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("lang") || "vi"
      : "vi"
  );
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lang", lang);
      }

      document.title = t(lang, "meta.title");
      const desc = document.querySelector(
        'meta[name="description"]'
      );
      if (desc) {
        desc.setAttribute("content", t(lang, "meta.desc"));
      }
    }
  }, [lang]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  const scrollToId = (id) => {
    if (typeof document === "undefined") return;
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (lang === "vi") {
      alert("Đã ghi nhận! Chúng tôi sẽ liên hệ sớm.");
    } else {
      alert("Received! We will contact you soon.");
    }
  };

  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="container header-row">
          <a
            className="brand"
            href="#top"
            aria-label={t(lang, "meta.title")}
          >
            {/* Đổi src thành đường dẫn logo thực tế của bạn */}
            <img
              src="/logo-inhere.png"
              alt={t(lang, "meta.title")}
              className="brand-logo"
            />
            <span className="brand-name">
              {t(lang, "brand.name")}
            </span>
          </a>

          <div className="header-right">
            <div className="lang" aria-label="Language switcher">
              <button
                className={
                  "lang-btn" +
                  (lang === "vi" ? " active" : "")
                }
                type="button"
                onClick={() => setLang("vi")}
              >
                VI
              </button>
              <button
                className={
                  "lang-btn" +
                  (lang === "en" ? " active" : "")
                }
                type="button"
                onClick={() => setLang("en")}
              >
                EN
              </button>
            </div>

            <a className="iconbtn" href="#contact">
              <span className="dot" />
              <span>{t(lang, "header.hotline")}</span>
            </a>
            <a className="iconbtn" href="#cart">
              <span>🛒</span>
              <span>{t(lang, "header.cart")}</span>
            </a>
          </div>
        </div>

        {/* NAVBAR */}
        <nav className="nav" aria-label="Primary navigation">
          <div className="container nav-row">
            <div className="nav-left">
              <a className="nav-item" href="#rent">
                {t(lang, "nav.rent")}
              </a>
              <a className="nav-item" href="#buy">
                {t(lang, "nav.buy")}
              </a>
              <a className="nav-item" href="#booking">
                {t(lang, "nav.booking")}
              </a>
              <a className="nav-item" href="#packages">
                {t(lang, "nav.packages")}
              </a>
              <a className="nav-item" href="#blog">
                {t(lang, "nav.blog")}
              </a>
              <a className="nav-item" href="#promo">
                {t(lang, "nav.promo")}
              </a>
              <a className="nav-item" href="#contact">
                {t(lang, "nav.contact")}
              </a>
            </div>

            <div className="nav-right">
              <input
                className="search"
                type="search"
                placeholder={t(
                  lang,
                  "search.placeholder"
                )}
              />
              <button
                className="cta"
                type="button"
                onClick={() => scrollToId("#booking")}
              >
                {t(lang, "cta.bookNow")}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* HERO SLIDER */}
      <section className="hero" id="top">
        <div className="slides">
          {/* Slide 1 */}
          <div
            className={
              "slide" +
              (currentSlide === 0 ? " active" : "")
            }
          >
            <div
              className="slide-bg"
              style={{
                backgroundImage:
                  "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
              }}
            />
            <div className="hero-content">
              <div className="hero-text">
                <div className="badge">
                  <span>INHERE</span>
                  <span style={{ opacity: 0.8 }}>
                    {t(lang, "hero.badge")}
                  </span>
                </div>

                <h1 className="h1">
                  {t(lang, "hero.h1_1")}
                </h1>
                <p className="sub">
                  {t(lang, "hero.sub_1")}
                </p>

                <div className="hero-actions">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => scrollToId("#rent")}
                  >
                    {t(lang, "hero.btn_rent")}
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() =>
                      scrollToId("#categories")
                    }
                  >
                    {t(lang, "hero.btn_view")}
                  </button>
                </div>
              </div>

              <aside className="hero-panel">
                <p className="panel-title">
                  {t(lang, "hero.panel_title")}
                </p>
                <ul className="panel-list">
                  <li>{t(lang, "hero.panel_1")}</li>
                  <li>{t(lang, "hero.panel_2")}</li>
                  <li>{t(lang, "hero.panel_3")}</li>
                </ul>
              </aside>
            </div>
          </div>

          {/* Slide 2 */}
          <div
            className={
              "slide" +
              (currentSlide === 1 ? " active" : "")
            }
          >
            <div
              className="slide-bg"
              style={{
                backgroundImage:
                  "url('https://hoianoutfit.com/wp-content/uploads/2022/08/HOI-AN-OUTFIT2.png')",
              }}
            />
            <div className="hero-content">
              <div className="hero-text">
                <div className="badge">
                  <span>INHERE</span>
                  <span style={{ opacity: 0.8 }}>
                    {t(lang, "hero.badge")}
                  </span>
                </div>

                <h1 className="h1">
                  {t(lang, "hero.h1_2")}
                </h1>
                <p className="sub">
                  {t(lang, "hero.sub_2")}
                </p>

                <div className="hero-actions">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() =>
                      scrollToId("#packages")
                    }
                  >
                    {t(lang, "hero.btn_packages")}
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() =>
                      scrollToId("#booking")
                    }
                  >
                    {t(lang, "hero.btn_booking")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 3 */}
          <div
            className={
              "slide" +
              (currentSlide === 2 ? " active" : "")
            }
          >
            <div
              className="slide-bg"
              style={{
                backgroundImage:
                  "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
              }}
            />
            <div className="hero-content">
              <div className="hero-text">
                <div className="badge">
                  <span>INHERE</span>
                  <span style={{ opacity: 0.8 }}>
                    {t(lang, "hero.badge")}
                  </span>
                </div>

                <h1 className="h1">
                  {t(lang, "hero.h1_3")}
                </h1>
                <p className="sub">
                  {t(lang, "hero.sub_3")}
                </p>

                <div className="hero-actions">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => scrollToId("#buy")}
                  >
                    {t(lang, "hero.btn_buy")}
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() =>
                      scrollToId("#contact")
                    }
                  >
                    {t(lang, "hero.btn_contact")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="dots" aria-label="Slider dots">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                className={
                  "dotbtn" +
                  (currentSlide === i ? " active" : "")
                }
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setCurrentSlide(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* POLICIES / PRINCIPLES */}
      <section className="soft" id="policy">
        <div className="container">
          <h2 className="section-title">
            {t(lang, "policy.title")}
          </h2>
          <p className="section-sub">
            {t(lang, "policy.sub")}
          </p>

          <div className="grid-6">
            <div className="card">
              <div className="icon">50%</div>
              <h4>{t(lang, "policy.c1.t")}</h4>
              <p>{t(lang, "policy.c1.d")}</p>
            </div>
            <div className="card">
              <div className="icon">✓</div>
              <h4>{t(lang, "policy.c2.t")}</h4>
              <p>{t(lang, "policy.c2.d")}</p>
            </div>
            <div className="card">
              <div className="icon">ID</div>
              <h4>{t(lang, "policy.c3.t")}</h4>
              <p>{t(lang, "policy.c3.d")}</p>
            </div>
            <div className="card">
              <div className="icon">⏱</div>
              <h4>{t(lang, "policy.c4.t")}</h4>
              <p>{t(lang, "policy.c4.d")}</p>
            </div>
            <div className="card">
              <div className="icon">⚠</div>
              <h4>{t(lang, "policy.c5.t")}</h4>
              <p>{t(lang, "policy.c5.d")}</p>
            </div>
            <div className="card">
              <div className="icon">↔</div>
              <h4>{t(lang, "policy.c6.t")}</h4>
              <p>{t(lang, "policy.c6.d")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED CATEGORIES */}
      <section id="categories">
        <div className="container">
          <h2 className="section-title">
            {t(lang, "cat.title")}
          </h2>
          <p className="section-sub">
            {t(lang, "cat.sub")}
          </p>

          <div className="grid-3">
            <a className="tile" href="#rent">
              <div
                className="tile-bg"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="tile-label">
                <h3>{t(lang, "cat.t1")}</h3>
                <span>{t(lang, "cat.cta")}</span>
              </div>
            </a>
            <a className="tile" href="#rent">
              <div
                className="tile-bg"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="tile-label">
                <h3>{t(lang, "cat.t2")}</h3>
                <span>{t(lang, "cat.cta")}</span>
              </div>
            </a>
            <a className="tile" href="#rent">
              <div
                className="tile-bg"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="tile-label">
                <h3>{t(lang, "cat.t3")}</h3>
                <span>{t(lang, "cat.cta")}</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* RENT PRODUCTS */}
      <section className="soft" id="rent">
        <div className="container">
          <div className="row-head">
            <h2>{t(lang, "rent.title")}</h2>
            <a href="#promo">{t(lang, "rent.more")}</a>
          </div>

          <div className="products">
            <article className="product">
              <div
                className="pimg"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="pbody">
                <p className="ptitle">
                  {t(lang, "rent.p1.n")}
                </p>
                <p className="pmeta">
                  {t(lang, "rent.p1.m")}
                </p>
                <div className="pactions">
                  <button
                    className="pbtn primary"
                    type="button"
                  >
                    {t(lang, "btn.rent")}
                  </button>
                  <button className="pbtn" type="button">
                    {t(lang, "btn.detail")}
                  </button>
                </div>
              </div>
            </article>

            <article className="product">
              <div
                className="pimg"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="pbody">
                <p className="ptitle">
                  {t(lang, "rent.p2.n")}
                </p>
                <p className="pmeta">
                  {t(lang, "rent.p2.m")}
                </p>
                <div className="pactions">
                  <button
                    className="pbtn primary"
                    type="button"
                  >
                    {t(lang, "btn.rent")}
                  </button>
                  <button className="pbtn" type="button">
                    {t(lang, "btn.detail")}
                  </button>
                </div>
              </div>
            </article>

            <article className="product">
              <div
                className="pimg"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="pbody">
                <p className="ptitle">
                  {t(lang, "rent.p3.n")}
                </p>
                <p className="pmeta">
                  {t(lang, "rent.p3.m")}
                </p>
                <div className="pactions">
                  <button
                    className="pbtn primary"
                    type="button"
                  >
                    {t(lang, "btn.rent")}
                  </button>
                  <button className="pbtn" type="button">
                    {t(lang, "btn.detail")}
                  </button>
                </div>
              </div>
            </article>

            <article className="product">
              <div
                className="pimg"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="pbody">
                <p className="ptitle">
                  {t(lang, "rent.p4.n")}
                </p>
                <p className="pmeta">
                  {t(lang, "rent.p4.m")}
                </p>
                <div className="pactions">
                  <button
                    className="pbtn primary"
                    type="button"
                  >
                    {t(lang, "btn.rent")}
                  </button>
                  <button className="pbtn" type="button">
                    {t(lang, "btn.detail")}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* BUY PRODUCTS */}
      <section id="buy">
        <div className="container">
          <div className="row-head">
            <h2>{t(lang, "buy.title")}</h2>
            <a href="#promo">{t(lang, "buy.more")}</a>
          </div>

          <div className="products">
            <article className="product">
              <div
                className="pimg"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="pbody">
                <p className="ptitle">
                  {t(lang, "buy.p1.n")}
                </p>
                <p className="pmeta">
                  {t(lang, "buy.p1.m")}
                </p>
                <div className="pactions">
                  <button
                    className="pbtn primary"
                    type="button"
                  >
                    {t(lang, "btn.buy")}
                  </button>
                  <button className="pbtn" type="button">
                    {t(lang, "btn.detail")}
                  </button>
                </div>
              </div>
            </article>

            <article className="product">
              <div
                className="pimg"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="pbody">
                <p className="ptitle">
                  {t(lang, "buy.p2.n")}
                </p>
                <p className="pmeta">
                  {t(lang, "buy.p2.m")}
                </p>
                <div className="pactions">
                  <button
                    className="pbtn primary"
                    type="button"
                  >
                    {t(lang, "btn.buy")}
                  </button>
                  <button className="pbtn" type="button">
                    {t(lang, "btn.detail")}
                  </button>
                </div>
              </div>
            </article>

            <article className="product">
              <div
                className="pimg"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="pbody">
                <p className="ptitle">
                  {t(lang, "buy.p3.n")}
                </p>
                <p className="pmeta">
                  {t(lang, "buy.p3.m")}
                </p>
                <div className="pactions">
                  <button
                    className="pbtn primary"
                    type="button"
                  >
                    {t(lang, "btn.buy")}
                  </button>
                  <button className="pbtn" type="button">
                    {t(lang, "btn.detail")}
                  </button>
                </div>
              </div>
            </article>

            <article className="product">
              <div
                className="pimg"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="pbody">
                <p className="ptitle">
                  {t(lang, "buy.p4.n")}
                </p>
                <p className="pmeta">
                  {t(lang, "buy.p4.m")}
                </p>
                <div className="pactions">
                  <button
                    className="pbtn primary"
                    type="button"
                  >
                    {t(lang, "btn.buy")}
                  </button>
                  <button className="pbtn" type="button">
                    {t(lang, "btn.detail")}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* BOOKING CTA */}
      <section className="soft" id="booking">
        <div className="container">
          <div className="cta-block">
            <div>
              <h2>{t(lang, "booking.title")}</h2>
              <p>{t(lang, "booking.sub")}</p>
            </div>

            <form className="form" onSubmit={handleBookingSubmit}>
              <input
                className="input"
                type="date"
                required
              />
              <input
                className="input"
                type="time"
                required
              />
              <input
                className="input"
                type="number"
                min="1"
                defaultValue="1"
                required
                placeholder={t(
                  lang,
                  "booking.guests"
                )}
              />
              <button
                className="submit"
                type="submit"
              >
                {t(lang, "booking.btn")}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages">
        <div className="container">
          <h2 className="section-title">
            {t(lang, "packages.title")}
          </h2>
          <p className="section-sub">
            {t(lang, "packages.sub")}
          </p>

          <div className="grid-3-cards">
            <div className="info-card">
              <h3>{t(lang, "packages.c1.t")}</h3>
              <ul>
                <li>
                  {t(lang, "packages.c1.b1")}
                </li>
                <li>
                  {t(lang, "packages.c1.b2")}
                </li>
                <li>
                  {t(lang, "packages.c1.b3")}
                </li>
              </ul>
            </div>
            <div className="info-card">
              <h3>{t(lang, "packages.c2.t")}</h3>
              <ul>
                <li>
                  {t(lang, "packages.c2.b1")}
                </li>
                <li>
                  {t(lang, "packages.c2.b2")}
                </li>
                <li>
                  {t(lang, "packages.c2.b3")}
                </li>
              </ul>
            </div>
            <div className="info-card">
              <h3>{t(lang, "packages.c3.t")}</h3>
              <ul>
                <li>
                  {t(lang, "packages.c3.b1")}
                </li>
                <li>
                  {t(lang, "packages.c3.b2")}
                </li>
                <li>
                  {t(lang, "packages.c3.b3")}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="soft" id="reviews">
        <div className="container">
          <h2 className="section-title">
            {t(lang, "reviews.title")}
          </h2>
          <p className="section-sub">
            {t(lang, "reviews.sub")}
          </p>

          <div className="grid-3-cards">
            <div className="info-card">
              <h3>★★★★★</h3>
              <p className="footer-text">
                {t(lang, "reviews.r1")}
              </p>
            </div>
            <div className="info-card">
              <h3>★★★★★</h3>
              <p className="footer-text">
                {t(lang, "reviews.r2")}
              </p>
            </div>
            <div className="info-card">
              <h3>★★★★★</h3>
              <p className="footer-text">
                {t(lang, "reviews.r3")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOG */}
      <section id="blog">
        <div className="container">
          <h2 className="section-title">
            {t(lang, "blog.title")}
          </h2>
          <p className="section-sub">
            {t(lang, "blog.sub")}
          </p>

          <div className="grid-3-cards">
            <div className="info-card">
              <h3>{t(lang, "blog.p1.t")}</h3>
              <p className="footer-text">
                {t(lang, "blog.p1.d")}
              </p>
            </div>
            <div className="info-card">
              <h3>{t(lang, "blog.p2.t")}</h3>
              <p className="footer-text">
                {t(lang, "blog.p2.d")}
              </p>
            </div>
            <div className="info-card">
              <h3>{t(lang, "blog.p3.t")}</h3>
              <p className="footer-text">
                {t(lang, "blog.p3.d")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROMO / CONTACT */}
      <section className="soft" id="promo">
        <div className="container">
          <h2 className="section-title">
            {t(lang, "promo.title")}
          </h2>
          <p className="section-sub">
            {t(lang, "promo.sub")}
          </p>
        </div>
      </section>

      <section id="contact">
        <div className="container">
          <h2 className="section-title">
            {t(lang, "contact.title")}
          </h2>
          <p className="section-sub">
            {t(lang, "contact.sub")}
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div>
              <p className="footer-title">
                {t(lang, "brand.name")}
              </p>
              <p className="footer-text">
                {t(lang, "footer.about")}
              </p>
            </div>

            <div>
              <p className="footer-title">
                {t(lang, "footer.col1")}
              </p>
              <div className="f-links">
                <a href="#rent">
                  {t(lang, "nav.rent")}
                </a>
                <a href="#buy">
                  {t(lang, "nav.buy")}
                </a>
                <a href="#packages">
                  {t(lang, "nav.packages")}
                </a>
                <a href="#booking">
                  {t(lang, "nav.booking")}
                </a>
              </div>
            </div>

            <div>
              <p className="footer-title">
                {t(lang, "footer.col2")}
              </p>
              <div className="f-links">
                <a href="#policy">
                  {t(lang, "policy.c1.t")}
                </a>
                <a href="#policy">
                  {t(lang, "policy.c3.t")}
                </a>
                <a href="#policy">
                  {t(lang, "policy.c4.t")}
                </a>
                <a href="#policy">
                  {t(lang, "policy.c5.t")}
                </a>
              </div>
            </div>

            <div>
              <p className="footer-title">
                {t(lang, "footer.col3")}
              </p>
              <p className="footer-text">
                <span>{t(lang, "footer.addr")}</span>
                <br />
                <span>{t(lang, "footer.phone")}</span>{" "}
                0900 000 000
                <br />
                Zalo / Facebook / Instagram
              </p>
            </div>
          </div>

          <div className="copy" id="cart">
            © {year} {t(lang, "brand.name")}. All rights
            reserved.
          </div>
        </div>
      </footer>
    </>
  );
};

export default Homepage;

