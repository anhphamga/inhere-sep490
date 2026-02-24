import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./HomePage.css";
import logo from "../assets/logo/logo.png";
import banner1 from "../assets/banner/banner 1.png";
import banner2 from "../assets/banner/banner2 (1).png";
import banner3 from "../assets/banner/banner3.png";
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

    "rent.title": "Trang phục được yêu thích",
    "rent.more": "Xem tất cả",
    "rent.p1.n": "Áo dài cổ điển (Full set)",
    "rent.p1.m": "Giá thuê theo ngày • Size S–XL",
    "rent.p2.n": "Việt phục (Kèm phụ kiện)",
    "rent.p2.m": "Set chụp phố cổ • Tư vấn phối đồ",
    "rent.p3.n": "Nhật Bình (Sang trọng)",
    "rent.p3.m": "Phù hợp concept cổ phục",
    "rent.p4.n": "Trang phục nam (Phố cổ)",
    "rent.p4.m": "Gọn gàng • Lịch sự • Dễ chụp",

    "buy.title": "C\u1ed4 PH\u1ee4C - VI\u1ec6T PH\u1ee4C CHO THU\u00ca",
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

    "rent.title": "Popular Products",
    "rent.more": "View all",
    "rent.p1.n": "Classic Ao Dai (Full set)",
    "rent.p1.m": "Daily rental • Sizes S–XL",
    "rent.p2.n": "Viet Attire (Accessories included)",
    "rent.p2.m": "Old Town photo set • Styling support",
    "rent.p3.n": "Nhat Binh (Elegant)",
    "rent.p3.m": "Perfect for traditional concepts",
    "rent.p4.n": "Men’s Outfit (Old Town)",
    "rent.p4.m": "Neat • Polite • Photo-friendly",

    "buy.title": "TRADITIONAL VIET COSTUMES FOR RENT",
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
const AUTO_SLIDE_MS = 5000;
const CATEGORY_SLIDE_MS = 2800;
const HOMEPAGE_PRODUCT_LIMIT = 8;
const PRODUCT_CATEGORIES = [
  {
    displayName: "Áo Dài Cho Thuê",
    slug: "ao-dai-cho-thue",
    type: "rent",
    count: 100,
    children: [],
  },
  {
    displayName: "Áo Dài Bà Sui",
    slug: "ao-dai-ba-sui",
    type: "rent",
    count: 2,
    children: [],
  },
  {
    displayName: "Áo Dài Bé",
    slug: "ao-dai-be",
    type: "rent",
    count: 1,
    children: [
      {
        displayName: "Áo Dài Bé Trai",
        slug: "ao-dai-be-trai",
        type: "rent",
        count: 1,
        children: [],
      },
    ],
  },
  {
    displayName: "Áo Dài Cách Tân Cho Thuê",
    slug: "ao-dai-cach-tan-cho-thue",
    type: "rent",
    count: 76,
    children: [],
  },
  {
    displayName: "Áo Dài Cưới",
    slug: "ao-dai-cuoi",
    type: "sale_or_rent",
    count: 6,
    children: [],
  },
  {
    displayName: "Áo Dài Gấm",
    slug: "ao-dai-gam",
    type: "rent",
    count: 17,
    children: [
      { displayName: "Gấm Hoa", slug: "gam-hoa", type: "rent", count: 10, children: [] },
      { displayName: "Gấm Thọ", slug: "gam-tho", type: "rent", count: 6, children: [] },
    ],
  },
  {
    displayName: "Áo Dài Suôn Lụa Trơn",
    slug: "ao-dai-suon-lua-tron",
    type: "rent",
    count: 17,
    children: [],
  },
  {
    displayName: "Áo Dài Thiết Kế Cho Thuê",
    slug: "ao-dai-thiet-ke-cho-thue",
    type: "rent",
    count: 16,
    children: [{ displayName: "In Hoa Văn", slug: "in-hoa-van", type: "rent", count: 4, children: [] }],
  },
  {
    displayName: "Áo Dài Tơ Thêu",
    slug: "ao-dai-to-theu",
    type: "rent",
    count: 19,
    children: [],
  },
  {
    displayName: "Áo Dài Cao Cấp",
    slug: "ao-dai-cao-cap",
    type: "sale_or_rent",
    count: 3,
    children: [],
  },
  {
    displayName: "Áo Dài Nam",
    slug: "ao-dai-nam",
    type: "sale_or_rent",
    count: 5,
    children: [],
  },
  {
    displayName: "Áo Dài Truyền Thống Cho Thuê",
    slug: "ao-dai-truyen-thong-cho-thue",
    type: "rent",
    count: 13,
    children: [],
  },
  {
    displayName: "Cho Thuê Váy Đầm Hội An",
    slug: "cho-thue-vay-dam-hoi-an",
    type: "rent",
    count: 37,
    children: [
      { displayName: "Váy Đi Tiệc", slug: "vay-di-tiec", type: "rent", count: 3, children: [] },
      { displayName: "Váy Vintage", slug: "vay-vintage", type: "rent", count: 11, children: [] },
      { displayName: "Yếm Chụp Ảnh", slug: "yem-chup-anh", type: "rent", count: 21, children: [] },
    ],
  },
  {
    displayName: "Cho Thuê Vest Hội An",
    slug: "cho-thue-vest-hoi-an",
    type: "rent",
    count: 14,
    children: [
      { displayName: "Vest Nam", slug: "vest-nam", type: "rent", count: 12, children: [] },
      { displayName: "Phụ Kiện Vest", slug: "phu-kien-vest", type: "rent", count: 2, children: [] },
    ],
  },
  {
    displayName: "Cổ Phục Cho Thuê Tại Hội An",
    slug: "co-phuc-cho-thue-tai-hoi-an",
    type: "rent",
    count: 16,
    children: [
      { displayName: "Áo Tấc", slug: "ao-tac", type: "rent", count: 11, children: [] },
      { displayName: "Nhật Bình", slug: "nhat-binh", type: "rent", count: 4, children: [] },
    ],
  },
  {
    displayName: "Đồ Cho Bé Cho Thuê Hội An",
    slug: "do-cho-be-cho-thue-hoi-an",
    type: "rent",
    count: 10,
    children: [
      { displayName: "Bé Gái", slug: "be-gai", type: "rent", count: 7, children: [] },
      { displayName: "Bé Trai", slug: "be-trai", type: "rent", count: 3, children: [] },
    ],
  },
  {
    displayName: "Gói Chụp Ảnh",
    slug: "goi-chup-anh",
    type: "service",
    count: 28,
    children: [],
  },
  {
    displayName: "Make Up",
    slug: "make-up",
    type: "service",
    count: 3,
    children: [],
  },
  {
    displayName: "Phụ Kiện Chụp Ảnh Cho Thuê",
    slug: "phu-kien-chup-anh-cho-thue",
    type: "rent",
    count: 83,
    children: [
      { displayName: "Băng Đô", slug: "bang-do", type: "rent", count: 0, children: [] },
      { displayName: "Nón", slug: "non", type: "rent", count: 0, children: [] },
      { displayName: "Quạt", slug: "quat", type: "rent", count: 0, children: [] },
      { displayName: "Túi Giỏ", slug: "tui-gio", type: "rent", count: 0, children: [] },
    ],
  },
  {
    displayName: "Quần Áo Dài",
    slug: "quan-ao-dai",
    type: "sale_or_rent",
    count: 1,
    children: [],
  },
  {
    displayName: "Sửa Đồ",
    slug: "sua-do",
    type: "service",
    count: 3,
    children: [],
  },
  {
    displayName: "Váy Cưới",
    slug: "vay-cuoi",
    type: "sale_or_rent",
    count: 1,
    children: [],
  },
];

const Homepage = ({ initialSection = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [lang, setLang] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("lang") || "vi"
      : "vi"
  );
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);
  const [activeSection, setActiveSection] = useState(initialSection || "rent");
  const [categories, setCategories] = useState(PRODUCT_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [topRentProducts, setTopRentProducts] = useState([]);
  const [topRentLoading, setTopRentLoading] = useState(true);
  const [buyProducts, setBuyProducts] = useState([]);
  const [buyLoading, setBuyLoading] = useState(true);
  const [fittingProducts, setFittingProducts] = useState([]);
  const [fittingLoading, setFittingLoading] = useState(true);
  const [blogs, setBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [blogsError, setBlogsError] = useState("");
  const [categorySlideIndex, setCategorySlideIndex] = useState(0);
  const [categoryVisibleCount, setCategoryVisibleCount] = useState(3);
  const slideIntervalRef = useRef(null);
  const categorySlideIntervalRef = useRef(null);

  // Banners từ file local - dùng useMemo để cập nhật khi lang thay đổi
  const heroBanners = useMemo(
    () => [
      {
        _id: "banner1",
        title: t(lang, "hero.h1_1"),
        subtitle: t(lang, "hero.sub_1"),
        imageUrl: banner1,
        targetLink: "#rent",
      },
      {
        _id: "banner2",
        title: t(lang, "hero.h1_2"),
        subtitle: t(lang, "hero.sub_2"),
        imageUrl: banner2,
        targetLink: "#packages",
      },
      {
        _id: "banner3",
        title: t(lang, "hero.h1_3"),
        subtitle: t(lang, "hero.sub_3"),
        imageUrl: banner3,
        targetLink: "#buy",
      },
    ],
    [lang]
  );

  const stopAutoSlide = useCallback(() => {
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current);
      slideIntervalRef.current = null;
    }
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      if (heroBanners.length === 0) return 0;
      return (prev + 1) % heroBanners.length;
    });
  }, [heroBanners.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      if (heroBanners.length === 0) return 0;
      return (prev - 1 + heroBanners.length) % heroBanners.length;
    });
  }, [heroBanners.length]);

  const goToSlide = useCallback(
    (index) => {
      if (heroBanners.length === 0) return;
      const normalized = (index + heroBanners.length) % heroBanners.length;
      setCurrentSlide(normalized);
    },
    [heroBanners.length]
  );

  const restartAutoSlide = useCallback(() => {
    stopAutoSlide();
    if (isSliderPaused || heroBanners.length <= 1) return;
    slideIntervalRef.current = setInterval(nextSlide, AUTO_SLIDE_MS);
  }, [heroBanners.length, isSliderPaused, nextSlide, stopAutoSlide]);

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
    setCurrentSlide(0);
  }, [heroBanners.length, lang]);

  useEffect(() => {
    restartAutoSlide();
    return stopAutoSlide;
  }, [restartAutoSlide, stopAutoSlide]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => {
      setIsSliderPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateCategoryVisibleCount = () => {
      const width = window.innerWidth;
      if (width <= 640) {
        setCategoryVisibleCount(1);
        return;
      }
      if (width <= 1024) {
        setCategoryVisibleCount(2);
        return;
      }
      setCategoryVisibleCount(3);
    };

    updateCategoryVisibleCount();
    window.addEventListener("resize", updateCategoryVisibleCount);
    return () => {
      window.removeEventListener("resize", updateCategoryVisibleCount);
    };
  }, []);

  useEffect(() => {
    if (categorySlideIntervalRef.current) {
      clearInterval(categorySlideIntervalRef.current);
      categorySlideIntervalRef.current = null;
    }

    if (categories.length <= categoryVisibleCount) {
      setCategorySlideIndex(0);
      return;
    }

    categorySlideIntervalRef.current = setInterval(() => {
      setCategorySlideIndex((prev) => (prev + 1) % categories.length);
    }, CATEGORY_SLIDE_MS);

    return () => {
      if (categorySlideIntervalRef.current) {
        clearInterval(categorySlideIntervalRef.current);
        categorySlideIntervalRef.current = null;
      }
    };
  }, [categories.length, categoryVisibleCount]);

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        setCategoriesError("");

        const response = await fetch("/api/categories");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const apiCategories = Array.isArray(payload?.categories)
          ? payload.categories
          : [];

        if (isMounted && apiCategories.length > 0) {
          setCategories(apiCategories);
        }
      } catch (error) {
        if (isMounted) {
          setCategoriesError(
            lang === "vi"
              ? "Không tải được danh mục từ API, đang dùng dữ liệu dự phòng."
              : "Failed to load categories from API, using fallback data."
          );
        }
      } finally {
        if (isMounted) {
          setCategoriesLoading(false);
        }
      }
    };

    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, [lang]);

  useEffect(() => {
    let isMounted = true;

    const fetchBlogs = async () => {
      try {
        setBlogsLoading(true);
        setBlogsError("");

        const response = await fetch("/api/blogs");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const blogData = Array.isArray(payload?.data) ? payload.data : [];
        if (isMounted) {
          setBlogs(blogData);
        }
      } catch (error) {
        if (isMounted) {
          setBlogsError(
            lang === "vi"
              ? "Không tải được bài viết từ API, đang dùng nội dung mặc định."
              : "Failed to load blog posts from API, using default content."
          );
        }
      } finally {
        if (isMounted) {
          setBlogsLoading(false);
        }
      }
    };

    fetchBlogs();
    return () => {
      isMounted = false;
    };
  }, [lang]);

  useEffect(() => {
    let isMounted = true;

    const fetchProductLists = async () => {
      try {
        setBuyLoading(true);
        setFittingLoading(true);

        const [buyRes, fittingRes] = await Promise.all([
          fetch("/api/products?purpose=all&limit=200"),
          fetch("/api/products?purpose=all&limit=200"),
        ]);

        if (buyRes.ok) {
          const buyPayload = await buyRes.json();
          const buyData = Array.isArray(buyPayload?.data) ? buyPayload.data : [];
          if (isMounted) {
            setBuyProducts(buyData);
          }
        }

        if (fittingRes.ok) {
          const fittingPayload = await fittingRes.json();
          const fittingData = Array.isArray(fittingPayload?.data) ? fittingPayload.data : [];
          if (isMounted) {
            setFittingProducts(fittingData);
          }
        }
      } catch (error) {
        console.warn("product list API unavailable, using fallback data", error);
      } finally {
        if (isMounted) {
          setBuyLoading(false);
          setFittingLoading(false);
        }
      }
    };

    fetchProductLists();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchTopRentedProducts = async () => {
      try {
        setTopRentLoading(true);

        const response = await fetch("/api/products/top-liked?limit=24");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const apiData = Array.isArray(payload?.data) ? payload.data : [];
        if (isMounted) {
          setTopRentProducts(apiData);
        }
      } catch (error) {
        // Silent fallback: keep UI stable with fallback cards when API is unavailable.
        console.warn("top-liked API unavailable, using fallback data", error);
      } finally {
        if (isMounted) {
          setTopRentLoading(false);
        }
      }
    };

    fetchTopRentedProducts();
    return () => {
      isMounted = false;
    };
  }, [lang]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    if (location.pathname === "/buy" || location.pathname === "/booking") {
      setActiveSection(location.pathname.slice(1));
      return;
    }

    const sectionIds = [
      "rent",
      "buy",
      "booking",
      "packages",
      "blog",
      "promo",
      "contact",
    ];

    const handleScroll = () => {
      const offset = 130; // gần bằng chiều cao header + nav
      let current = sectionIds[0];

      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        if (top - offset <= 0) {
          current = id;
        }
      });

      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  const scrollToId = (id) => {
    if (typeof document === "undefined") return;
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!initialSection) return;
    const target = `#${initialSection}`;
    const timer = setTimeout(() => {
      scrollToId(target);
      setActiveSection(initialSection);
    }, 50);
    return () => clearTimeout(timer);
  }, [initialSection]);

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (lang === "vi") {
      alert("Đã ghi nhận! Chúng tôi sẽ liên hệ sớm.");
    } else {
      alert("Received! We will contact you soon.");
    }
  };

  const getCategoryTypeLabel = (type) => {
    if (lang === "vi") {
      if (type === "rent") return "Cho thuê";
      if (type === "sale_or_rent") return "Bán / Thuê";
      if (type === "service") return "Dịch vụ";
      return "Khác";
    }
    if (type === "rent") return "Rent";
    if (type === "sale_or_rent") return "Sale / Rent";
    if (type === "service") return "Service";
    return "Other";
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
      style: "currency",
      currency: lang === "vi" ? "VND" : "USD",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const hasRealImage = (imageUrl) =>
    typeof imageUrl === "string" && imageUrl.trim().length > 0;

  const normalizeText = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const isTraditionalCostume = (item) => {
    const haystack = `${item?.name || ""} ${item?.category || ""}`;
    const normalized = normalizeText(haystack);
    return (
      normalized.includes("co phuc") ||
      normalized.includes("viet phuc") ||
      normalized.includes("nhat binh") ||
      normalized.includes("ao tac")
    );
  };

  const isDressRental = (item) => {
    const haystack = `${item?.name || ""} ${item?.category || ""}`;
    const normalized = normalizeText(haystack);
    return normalized.includes("vay") || normalized.includes("dam");
  };

  const displayedRentProducts =
    topRentProducts.length > 0
      ? topRentProducts
          .filter((item) => hasRealImage(item.imageUrl))
          .slice(0, HOMEPAGE_PRODUCT_LIMIT)
          .map((item) => ({
          id: item._id,
          name: item.name,
          meta:
            lang === "vi"
              ? `${item.category} • ${item.likeCount || 0} lượt thích • ${formatCurrency(item.baseRentPrice)}/ngày`
              : `${item.category} • ${item.likeCount || 0} likes • ${formatCurrency(item.baseRentPrice)}/day`,
          imageUrl: item.imageUrl,
        }))
      : [];

  const canViewProductDetail = (productId) => Boolean(productId);

  const displayedBuyProducts =
    buyProducts.length > 0
      ? buyProducts
          .filter((item) => hasRealImage(item.imageUrl))
          .filter((item) => isTraditionalCostume(item))
          .filter((item) => Number(item.baseRentPrice || 0) > 0)
          .slice(0, HOMEPAGE_PRODUCT_LIMIT)
          .map((item) => ({
          id: item._id,
          name: item.name,
          meta:
            lang === "vi"
              ? `${item.category} • Thuê từ ${formatCurrency(item.baseRentPrice)}/ngày`
              : `${item.category} • From ${formatCurrency(item.baseRentPrice)}/day`,
          imageUrl: item.imageUrl,
        }))
      : [];

  const displayedFittingProducts =
    fittingProducts.length > 0
      ? fittingProducts
          .filter((item) => hasRealImage(item.imageUrl))
          .filter((item) => isDressRental(item))
          .filter((item) => Number(item.baseRentPrice || 0) > 0)
          .slice(0, HOMEPAGE_PRODUCT_LIMIT)
          .map((item) => ({
          id: item._id,
          name: item.name,
          meta:
            lang === "vi"
              ? `${item.category} • Thuê từ ${formatCurrency(item.baseRentPrice)}/ngày`
              : `${item.category} • From ${formatCurrency(item.baseRentPrice)}/day`,
            imageUrl: item.imageUrl,
          }))
      : [];

  const fallbackBlogPosts = [
    { id: "blog-fallback-1", title: t(lang, "blog.p1.t"), excerpt: t(lang, "blog.p1.d"), thumbnail: "" },
    { id: "blog-fallback-2", title: t(lang, "blog.p2.t"), excerpt: t(lang, "blog.p2.d"), thumbnail: "" },
    { id: "blog-fallback-3", title: t(lang, "blog.p3.t"), excerpt: t(lang, "blog.p3.d"), thumbnail: "" },
  ];

  const displayedBlogs =
    blogs.length > 0
      ? blogs.slice(0, 6).map((item, index) => {
          const rawContent = String(item?.content || "").trim();
          const lines = rawContent
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
          const title =
            String(item?.title || "").trim() ||
            lines[0] ||
            (lang === "vi"
              ? `Bài viết ${index + 1}`
              : `Post ${index + 1}`);
          const body = lines.slice(1).join(" ") || rawContent;
          const excerpt =
            body.length > 180 ? `${body.slice(0, 177)}...` : body;

          return {
            id: item?._id || `blog-${index + 1}`,
            title,
            thumbnail: String(item?.thumbnail || "").trim(),
            excerpt:
              excerpt ||
              (lang === "vi"
                ? "Nội dung đang được cập nhật."
                : "Content is being updated."),
          };
        })
      : fallbackBlogPosts;

  const displayedCategories = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) {
      return [];
    }
    if (categories.length <= categoryVisibleCount) {
      return categories;
    }

    return Array.from({ length: categoryVisibleCount }, (_, offset) => {
      const index = (categorySlideIndex + offset) % categories.length;
      return categories[index];
    });
  }, [categories, categorySlideIndex, categoryVisibleCount]);

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
              src={logo}
              alt={t(lang, "meta.title")}
              className="brand-logo"
            />
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
              <a
                className={
                  "nav-item" +
                  (activeSection === "rent" ? " active" : "")
                }
                href="#rent"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId("#rent");
                  setActiveSection("rent");
                }}
              >
                {t(lang, "nav.rent")}
              </a>
              <Link
                className={
                  "nav-item" +
                  (activeSection === "buy" ? " active" : "")
                }
                to="/buy"
                onClick={() => {
                  setActiveSection("buy");
                }}
              >
                {t(lang, "nav.buy")}
              </Link>
              <Link
                className={
                  "nav-item" +
                  (activeSection === "booking" ? " active" : "")
                }
                to="/booking"
                onClick={() => {
                  setActiveSection("booking");
                }}
              >
                {t(lang, "nav.booking")}
              </Link>
              <a
                className={
                  "nav-item" +
                  (activeSection === "blog" ? " active" : "")
                }
                href="#blog"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId("#blog");
                  setActiveSection("blog");
                }}
              >
                {t(lang, "nav.blog")}
              </a>
              <a
                className={
                  "nav-item" +
                  (activeSection === "promo" ? " active" : "")
                }
                href="#promo"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId("#promo");
                  setActiveSection("promo");
                }}
              >
                {t(lang, "nav.promo")}
              </a>
              <a
                className={
                  "nav-item" +
                  (activeSection === "contact" ? " active" : "")
                }
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId("#contact");
                  setActiveSection("contact");
                }}
              >
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
                onClick={() => {
                  navigate("/booking");
                  setActiveSection("booking");
                }}
              >
                {t(lang, "cta.bookNow")}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* HERO SLIDER */}
      <section className="hero" id="top">
        <div
          className="slides"
          onMouseEnter={() => setIsSliderPaused(true)}
          onMouseLeave={() => setIsSliderPaused(false)}
          onFocusCapture={() => setIsSliderPaused(true)}
          onBlurCapture={() => setIsSliderPaused(false)}
        >
          {heroBanners.length > 0 ? (
            heroBanners.map((b, idx) => {
              const bg = b.imageUrl || "";

              const handleTargetClick = () => {
                if (!b.targetLink) return;
                if (b.targetLink.startsWith("#")) {
                  scrollToId(b.targetLink);
                } else if (b.targetLink.startsWith("http")) {
                  window.open(b.targetLink, "_blank");
                } else {
                  window.location.href = b.targetLink;
                }
              };

              return (
                <div
                  key={b._id || idx}
                  className={
                    "slide" + (currentSlide === idx ? " active" : "")
                  }
                >
                  {bg && (
                    <div
                      className="slide-backdrop"
                      style={{ backgroundImage: `url(${bg})` }}
                    />
                  )}
                  {bg && (
                    <div className="hero-media-frame">
                      <img
                        src={bg}
                        alt=""
                        aria-hidden="true"
                        className="slide-bg-fill"
                      />
                      <img
                        src={bg}
                        alt={b.title || `Banner ${idx + 1}`}
                        className="slide-bg"
                      />
                    </div>
                  )}
                  {!bg && (
                    <div className="hero-media-frame">
                      <div
                        className="slide-bg"
                        style={{
                          backgroundColor: "#111",
                        }}
                      />
                    </div>
                  )}
                  <div className="hero-content">
                    <div className="hero-text">
                      <div className="hero-head">
                        <div className="badge">
                          <span>INHERE</span>
                          <span style={{ opacity: 0.8 }}>
                            {t(lang, "hero.badge")}
                          </span>
                        </div>
                        <div className="hero-counter">
                          {(idx + 1).toString().padStart(2, "0")} /{" "}
                          {heroBanners.length.toString().padStart(2, "0")}
                        </div>
                      </div>

                      <h1 className="h1">{b.title || t(lang, "hero.h1_1")}</h1>
                      <p className="sub">
                        {b.subtitle || t(lang, "hero.sub_1")}
                      </p>

                      <div className="hero-actions">
                        <button
                          className="btn primary"
                          type="button"
                          onClick={handleTargetClick}
                        >
                          {lang === "vi" ? "Xem ngay" : "Explore"}
                        </button>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => scrollToId("#booking")}
                        >
                          {lang === "vi" ? "Đặt lịch thử đồ" : "Book fitting"}
                        </button>
                      </div>

                      <div className="hero-kpis">
                        <span>{lang === "vi" ? "4.9/5 đánh giá" : "4.9/5 reviews"}</span>
                        <span>{lang === "vi" ? "2000+ lượt thuê" : "2000+ rentals"}</span>
                        <span>{lang === "vi" ? "Hỗ trợ 7 ngày/tuần" : "Support 7 days/week"}</span>
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
                      <div className="hero-progress">
                        <span
                          style={{
                            width: `${((idx + 1) / heroBanners.length) * 100}%`,
                          }}
                        />
                      </div>
                    </aside>
                  </div>
                </div>
              );
            })
          ) : (
            // Fallback khi chưa có banners từ API
            <div className="slide active">
              <div
                className="slide-backdrop"
                style={{
                  backgroundImage:
                    "url('https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg')",
                }}
              />
              <div className="hero-media-frame">
                <img
                  className="slide-bg-fill"
                  src="https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg"
                  alt=""
                  aria-hidden="true"
                />
                <img
                  className="slide-bg"
                  src="https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg"
                  alt="Fallback banner"
                />
              </div>
              <div className="hero-content">
                <div className="hero-text">
                  <div className="badge">
                    <span>INHERE</span>
                    <span style={{ opacity: 0.8 }}>
                      {t(lang, "hero.badge")}
                    </span>
                  </div>
                  <h1 className="h1">{t(lang, "hero.h1_1")}</h1>
                  <p className="sub">{t(lang, "hero.sub_1")}</p>
                  <div className="hero-actions">
                    <button
                      className="btn primary"
                      type="button"
                      onClick={() => scrollToId("#rent")}
                    >
                      {t(lang, "hero.btn_rent")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {heroBanners.length > 0 && (
            <div className="dots" aria-label="Slider dots">
              <button
                className="hero-nav prev"
                type="button"
                aria-label={lang === "vi" ? "Banner trước" : "Previous banner"}
                onClick={() => {
                  prevSlide();
                  restartAutoSlide();
                }}
              >
                ‹
              </button>
              {heroBanners.map((_, i) => (
                <button
                  key={i}
                  className={
                    "dotbtn" + (currentSlide === i ? " active" : "")
                  }
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => {
                    goToSlide(i);
                    restartAutoSlide();
                  }}
                />
              ))}
              <button
                className="hero-nav next"
                type="button"
                aria-label={lang === "vi" ? "Banner tiếp theo" : "Next banner"}
                onClick={() => {
                  nextSlide();
                  restartAutoSlide();
                }}
              >
                ›
              </button>
            </div>
          )}
          {heroBanners.length > 0 && (
            <div className="hero-scroll-hint">
              {lang === "vi"
                ? "Cuộn để khám phá bộ sưu tập"
                : "Scroll to discover collections"}
            </div>
          )}
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

          {categoriesLoading && (
            <p className="category-status">
              {lang === "vi" ? "Đang tải danh mục..." : "Loading categories..."}
            </p>
          )}
          {categoriesError && (
            <p className="category-status warning">{categoriesError}</p>
          )}
          <div
            className="category-grid category-grid-row"
            style={{ "--category-columns": displayedCategories.length }}
          >
            {displayedCategories.map((category, index) => (
              <article className="category-card" key={`${category.slug}-${index}`}>
                <div className="category-image-wrap">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.displayName}
                      className="category-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="category-image placeholder">
                      {lang === "vi" ? "Chưa có ảnh" : "No image"}
                    </div>
                  )}
                </div>
                <div className="category-card-top">
                  <h3>{category.displayName}</h3>
                  <span className={"category-type " + category.type}>
                    {getCategoryTypeLabel(category.type)}
                  </span>
                </div>
                <p className="category-count">
                  {lang === "vi"
                    ? `${category.count} sản phẩm`
                    : `${category.count} items`}
                </p>
                {Array.isArray(category.children) && category.children.length > 0 && (
                  <ul className="category-children">
                    {category.children.map((child) => (
                      <li key={child.slug}>
                        <span>{child.displayName}</span>
                        <strong>{child.count}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
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
          {topRentLoading && (
            <p className="rent-status">
              {lang === "vi"
                ? "Đang tải top trang phục thuê..."
                : "Loading top rental products..."}
            </p>
          )}

          {!topRentLoading && displayedRentProducts.length === 0 && (
            <p className="rent-status warning">
              {lang === "vi"
                ? "Ch\u01b0a c\u00f3 s\u1ea3n ph\u1ea9m c\u00f3 \u1ea3nh th\u1eadt trong m\u1ee5c n\u00e0y."
                : "No products with real images are available in this section yet."}
            </p>
          )}
          <div className="products">
            {displayedRentProducts.map((product) => (
              <article className="product" key={product.id}>
                <div
                  className="pimg"
                  style={{ backgroundImage: `url('${product.imageUrl}')` }}
                />
                <div className="pbody">
                  <p className="ptitle">{product.name}</p>
                  <p className="pmeta">{product.meta}</p>
                  <div className="pactions">
                    <button className="pbtn primary" type="button">
                      {t(lang, "btn.rent")}
                    </button>
                    {canViewProductDetail(product.id) ? (
                      <button
                        className="pbtn"
                        type="button"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        {t(lang, "btn.detail")}
                      </button>
                    ) : (
                      <button className="pbtn" type="button" disabled>
                        {t(lang, "btn.detail")}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
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
          {buyLoading && (
            <p className="rent-status">
              {lang === "vi"
                ? "Đang tải danh sách sản phẩm mua..."
                : "Loading buy products..."}
            </p>
          )}

          {!buyLoading && displayedBuyProducts.length === 0 && (
            <p className="rent-status warning">
              {lang === "vi"
                ? "Ch\u01b0a c\u00f3 s\u1ea3n ph\u1ea9m c\u00f3 \u1ea3nh th\u1eadt trong m\u1ee5c n\u00e0y."
                : "No products with real images are available in this section yet."}
            </p>
          )}
          <div className="products">
            {displayedBuyProducts.map((product) => (
              <article className="product" key={product.id}>
                <div
                  className="pimg"
                  style={{ backgroundImage: `url('${product.imageUrl}')` }}
                />
                <div className="pbody">
                  <p className="ptitle">{product.name}</p>
                  <p className="pmeta">{product.meta}</p>
                  <div className="pactions">
                    <button className="pbtn primary" type="button">
                      {t(lang, "btn.buy")}
                    </button>
                    <button
                      className="pbtn"
                      type="button"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      {t(lang, "btn.detail")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
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
          <div className="row-head fitting-head">
            <h2>
              {lang === "vi" ? "Váy - đầm cho thuê" : "Dress Rentals"}
            </h2>
            <a href="#rent">{lang === "vi" ? "Xem đồ thuê" : "View rentals"}</a>
          </div>
          {fittingLoading && (
            <p className="rent-status">
              {lang === "vi"
                ? "Đang tải danh sách thử đồ..."
                : "Loading fitting products..."}
            </p>
          )}
          {!fittingLoading && displayedFittingProducts.length === 0 && (
            <p className="rent-status warning">
              {lang === "vi"
                ? "Ch\u01b0a c\u00f3 s\u1ea3n ph\u1ea9m c\u00f3 \u1ea3nh th\u1eadt trong m\u1ee5c n\u00e0y."
                : "No products with real images are available in this section yet."}
            </p>
          )}
          <div className="products">
            {displayedFittingProducts.map((product) => (
              <article className="product" key={`fit-${product.id}`}>
                <div
                  className="pimg"
                  style={{ backgroundImage: `url('${product.imageUrl}')` }}
                />
                <div className="pbody">
                  <p className="ptitle">{product.name}</p>
                  <p className="pmeta">{product.meta}</p>
                  <div className="pactions">
                    <button className="pbtn primary" type="button">
                      {t(lang, "booking.btn")}
                    </button>
                    <button
                      className="pbtn"
                      type="button"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      {t(lang, "btn.detail")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
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

          {blogsLoading && (
            <p className="rent-status">
              {lang === "vi" ? "Đang tải bài viết..." : "Loading blog posts..."}
            </p>
          )}
          {blogsError && (
            <p className="rent-status warning">{blogsError}</p>
          )}

          <div className="grid-3-cards">
            {displayedBlogs.map((post) => (
              <div className="info-card" key={post.id}>
                {post.thumbnail ? (
                  <img
                    className="blog-thumb"
                    src={post.thumbnail}
                    alt={post.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="blog-thumb blog-thumb-placeholder">
                    {lang === "vi" ? "Chưa có ảnh" : "No image"}
                  </div>
                )}
                <h3>{post.title}</h3>
                <p className="footer-text">{post.excerpt}</p>
              </div>
            ))}
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
                <Link
                  to="/buy"
                  onClick={() => {
                    setActiveSection("buy");
                  }}
                >
                  {t(lang, "nav.buy")}
                </Link>
                <a href="#packages">
                  {t(lang, "nav.packages")}
                </a>
                <Link
                  to="/booking"
                  onClick={() => {
                    setActiveSection("booking");
                  }}
                >
                  {t(lang, "nav.booking")}
                </Link>
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

