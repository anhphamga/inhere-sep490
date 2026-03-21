import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import { useRentalCart } from "../../contexts/RentalCartContext";
import "../../style/pages/ProductPages.css";

const BO_LOC_MAC_DINH = {
  timKiem: "",
  danhMuc: "",
  gioiTinh: "",
  khoangGia: "",
  kichThuoc: [],
  tinhTrang: "",
};

const LUA_CHON_DANH_MUC = ["Áo dài", "Nhật bình", "Phụ kiện"];
const LUA_CHON_GIOI_TINH = ["Nam", "Nữ", "Unisex"];
const LUA_CHON_KICH_THUOC = ["S", "M", "L", "XL"];
const LUA_CHON_TINH_TRANG = ["Còn sẵn", "Sắp hết"];
const LUA_CHON_SAP_XEP = [
  { value: "pho-bien", label: "Phổ biến" },
  { value: "moi-nhat", label: "Mới nhất" },
  { value: "gia-tang", label: "Giá tăng dần" },
  { value: "gia-giam", label: "Giá giảm dần" },
];
const LUA_CHON_KHOANG_GIA = [
  { value: "", label: "Tất cả mức giá" },
  { value: "duoi-300", label: "Dưới 300.000đ" },
  { value: "300-500", label: "300.000đ - 500.000đ" },
  { value: "tren-500", label: "Trên 500.000đ" },
];
const SO_SAN_PHAM_MOI_TRANG = 9;

const taoAnhMoPhong = (tieuDe, mauNen1, mauNen2) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 960">
      <defs>
        <linearGradient id="nen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${mauNen1}" />
          <stop offset="100%" stop-color="${mauNen2}" />
        </linearGradient>
      </defs>
      <rect width="800" height="960" fill="url(#nen)" rx="36" />
      <circle cx="632" cy="168" r="114" fill="rgba(255,255,255,0.12)" />
      <circle cx="150" cy="786" r="144" fill="rgba(255,255,255,0.1)" />
      <rect x="174" y="142" width="452" height="632" rx="180" fill="rgba(255,255,255,0.18)" />
      <rect x="264" y="112" width="272" height="184" rx="110" fill="rgba(255,255,255,0.28)" />
      <text x="400" y="840" text-anchor="middle" fill="white" font-size="42" font-family="Arial, sans-serif" font-weight="700">${tieuDe}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const DU_LIEU_MAU = [
  {
    id: "mau-ao-dai-do",
    slug: "ao-dai-gam-do-thu-cong",
    ten: "Áo dài gấm đỏ thêu thủ công",
    anh: taoAnhMoPhong("Áo dài gấm đỏ", "#7f1d1d", "#f59e0b"),
    danhMuc: "Áo dài",
    gioiTinh: "Nữ",
    giaThue: 350000,
    soNgayMacDinh: 3,
    kichThuoc: ["S", "M", "L"],
    tinhTrang: "Còn sẵn",
    nhan: ["Mới", "Nổi bật"],
    moTaNgan: "Phom dáng tôn dáng, thích hợp chụp ảnh ngoại cảnh và sự kiện truyền thống.",
    luotQuanTam: 92,
    ngayCapNhat: "2026-03-18T10:30:00.000Z",
  },
  {
    id: "mau-nhat-binh-vang",
    slug: "nhat-binh-vang-cung-dinh",
    ten: "Nhật bình vàng cung đình",
    anh: taoAnhMoPhong("Nhật bình vàng", "#92400e", "#fcd34d"),
    danhMuc: "Nhật bình",
    gioiTinh: "Nữ",
    giaThue: 560000,
    soNgayMacDinh: 3,
    kichThuoc: ["M", "L", "XL"],
    tinhTrang: "Sắp hết",
    nhan: ["Nổi bật", "Còn ít"],
    moTaNgan: "Mẫu cổ phục nổi bật với sắc vàng sang trọng, phù hợp buổi lễ và concept cao cấp.",
    luotQuanTam: 118,
    ngayCapNhat: "2026-03-12T09:00:00.000Z",
  },
  {
    id: "mau-ao-dai-nam-den",
    slug: "ao-dai-nam-den-tinh-gon",
    ten: "Áo dài nam đen tối giản",
    anh: taoAnhMoPhong("Áo dài nam đen", "#111827", "#475569"),
    danhMuc: "Áo dài",
    gioiTinh: "Nam",
    giaThue: 320000,
    soNgayMacDinh: 3,
    kichThuoc: ["M", "L", "XL"],
    tinhTrang: "Còn sẵn",
    nhan: ["Mới"],
    moTaNgan: "Thiết kế thanh lịch, dễ phối cùng khăn đóng cho lễ gia tiên hoặc chụp hình cặp đôi.",
    luotQuanTam: 74,
    ngayCapNhat: "2026-03-20T08:20:00.000Z",
  },
  {
    id: "mau-phu-kien-khan-dong",
    slug: "khan-dong-theu-vang",
    ten: "Khăn đóng thêu vàng cao cấp",
    anh: taoAnhMoPhong("Khăn đóng", "#78350f", "#fbbf24"),
    danhMuc: "Phụ kiện",
    gioiTinh: "Unisex",
    giaThue: 180000,
    soNgayMacDinh: 3,
    kichThuoc: ["M", "L"],
    tinhTrang: "Còn sẵn",
    nhan: ["Nổi bật"],
    moTaNgan: "Phụ kiện hoàn thiện set cổ phục, chất vải đứng form và lên ảnh đẹp.",
    luotQuanTam: 51,
    ngayCapNhat: "2026-03-05T14:00:00.000Z",
  },
  {
    id: "mau-ao-dai-lua-hong",
    slug: "ao-dai-lua-hong-phan",
    ten: "Áo dài lụa hồng phấn",
    anh: taoAnhMoPhong("Áo dài hồng", "#be185d", "#f9a8d4"),
    danhMuc: "Áo dài",
    gioiTinh: "Nữ",
    giaThue: 280000,
    soNgayMacDinh: 3,
    kichThuoc: ["S", "M"],
    tinhTrang: "Sắp hết",
    nhan: ["Còn ít"],
    moTaNgan: "Tông màu nhẹ nhàng, hợp chụp ảnh kỷ niệm, lễ hội và du lịch phố cổ.",
    luotQuanTam: 66,
    ngayCapNhat: "2026-03-10T17:30:00.000Z",
  },
  {
    id: "mau-nhat-binh-xanh",
    slug: "nhat-binh-xanh-ngoc",
    ten: "Nhật bình xanh ngọc thêu tay",
    anh: taoAnhMoPhong("Nhật bình xanh", "#0f766e", "#5eead4"),
    danhMuc: "Nhật bình",
    gioiTinh: "Nữ",
    giaThue: 620000,
    soNgayMacDinh: 3,
    kichThuoc: ["M", "L"],
    tinhTrang: "Còn sẵn",
    nhan: ["Nổi bật"],
    moTaNgan: "Chất liệu đứng phom, họa tiết thêu tinh xảo, phù hợp concept cung đình cổ điển.",
    luotQuanTam: 130,
    ngayCapNhat: "2026-03-16T15:10:00.000Z",
  },
  {
    id: "mau-ao-dai-trang",
    slug: "ao-dai-trang-phoi-ren",
    ten: "Áo dài trắng phối ren",
    anh: taoAnhMoPhong("Áo dài trắng", "#cbd5e1", "#f8fafc"),
    danhMuc: "Áo dài",
    gioiTinh: "Nữ",
    giaThue: 260000,
    soNgayMacDinh: 3,
    kichThuoc: ["S", "M", "L"],
    tinhTrang: "Còn sẵn",
    nhan: ["Mới"],
    moTaNgan: "Thiết kế thanh thoát, phù hợp chụp ảnh nhẹ nhàng hoặc sự kiện cần vẻ trang nhã.",
    luotQuanTam: 58,
    ngayCapNhat: "2026-03-19T11:40:00.000Z",
  },
  {
    id: "mau-phu-kien-quat",
    slug: "quat-lua-theu-hoa",
    ten: "Quạt lụa thêu hoa cổ điển",
    anh: taoAnhMoPhong("Quạt lụa", "#7c3aed", "#c4b5fd"),
    danhMuc: "Phụ kiện",
    gioiTinh: "Nữ",
    giaThue: 120000,
    soNgayMacDinh: 3,
    kichThuoc: ["S", "M", "L"],
    tinhTrang: "Còn sẵn",
    nhan: [],
    moTaNgan: "Phụ kiện điểm nhấn cho bộ ảnh cổ trang, dễ kết hợp với áo dài và nhật bình.",
    luotQuanTam: 39,
    ngayCapNhat: "2026-03-02T10:00:00.000Z",
  },
  {
    id: "mau-ao-dai-unisex-xanh",
    slug: "ao-dai-unisex-xanh-co-vi",
    ten: "Áo dài xanh cổ vị unisex",
    anh: taoAnhMoPhong("Áo dài unisex", "#1d4ed8", "#93c5fd"),
    danhMuc: "Áo dài",
    gioiTinh: "Unisex",
    giaThue: 390000,
    soNgayMacDinh: 3,
    kichThuoc: ["M", "L", "XL"],
    tinhTrang: "Còn sẵn",
    nhan: ["Nổi bật"],
    moTaNgan: "Thiết kế linh hoạt cho nhóm bạn hoặc cặp đôi muốn phối đồ đồng điệu.",
    luotQuanTam: 86,
    ngayCapNhat: "2026-03-17T13:20:00.000Z",
  },
  {
    id: "mau-phu-kien-ao-khoac",
    slug: "ao-khoac-ngoai-theu-hoa",
    ten: "Áo khoác ngoài thêu hoa",
    anh: taoAnhMoPhong("Áo khoác ngoài", "#6b21a8", "#f0abfc"),
    danhMuc: "Phụ kiện",
    gioiTinh: "Unisex",
    giaThue: 240000,
    soNgayMacDinh: 3,
    kichThuoc: ["L", "XL"],
    tinhTrang: "Sắp hết",
    nhan: ["Còn ít"],
    moTaNgan: "Lớp phủ hoàn thiện set chụp hình, tăng chiều sâu cho tổng thể trang phục.",
    luotQuanTam: 44,
    ngayCapNhat: "2026-03-07T09:45:00.000Z",
  },
];

const dinhDangTien = (giaTri) =>
  `${Number(giaTri || 0).toLocaleString("vi-VN")}đ`;

const boDau = (giaTri = "") =>
  String(giaTri || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const suyRaDanhMuc = (giaTri = "") => {
  const noiDung = boDau(giaTri);
  if (noiDung.includes("ao dai")) return "Áo dài";
  if (noiDung.includes("nhat binh")) return "Nhật bình";
  return "Phụ kiện";
};

const suyRaGioiTinh = (ten = "", danhMuc = "", chiSo = 0) => {
  const duLieu = boDau(`${ten} ${danhMuc}`);
  if (duLieu.includes("nam")) return "Nam";
  if (duLieu.includes("nu")) return "Nữ";
  return chiSo % 4 === 0 ? "Unisex" : "Nữ";
};

const suyRaTinhTrang = (sanPham = {}, chiSo = 0) => {
  if (Number(sanPham.availableQuantity) > 0 && Number(sanPham.availableQuantity) <= 2) {
    return "Sắp hết";
  }
  if (chiSo % 5 === 0) return "Sắp hết";
  return "Còn sẵn";
};

const suyRaNhan = (sanPham = {}, tinhTrang = "Còn sẵn", chiSo = 0) => {
  const nhan = [];
  const ngayCapNhat = new Date(sanPham.createdAt || sanPham.updatedAt || Date.now());
  const chenhlechNgay = Math.max(
    0,
    Math.floor((Date.now() - ngayCapNhat.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (chenhlechNgay <= 14 || chiSo % 4 === 0) nhan.push("Mới");
  if (Number(sanPham.likeCount || 0) >= 8 || chiSo % 3 === 0) nhan.push("Nổi bật");
  if (tinhTrang === "Sắp hết") nhan.push("Còn ít");

  return Array.from(new Set(nhan));
};

const chuyenSanPhamTuApi = (sanPham, chiSo) => {
  const danhMuc = suyRaDanhMuc(sanPham?.category || "");
  const gioiTinh = suyRaGioiTinh(sanPham?.name || "", sanPham?.category || "", chiSo);
  const tinhTrang = suyRaTinhTrang(sanPham, chiSo);
  const kichThuoc =
    Array.isArray(sanPham?.sizes) && sanPham.sizes.length > 0
      ? sanPham.sizes.map((item) => String(item).trim().toUpperCase()).filter(Boolean)
      : ["M", "L"];

  return {
    id: sanPham?._id || `api-${chiSo}`,
    slug: sanPham?._id || `api-${chiSo}`,
    ten: sanPham?.name || "Trang phục đang cập nhật",
    anh:
      sanPham?.imageUrl ||
      (Array.isArray(sanPham?.images) ? sanPham.images[0] : "") ||
      taoAnhMoPhong("Trang phục", "#334155", "#cbd5e1"),
    danhMuc,
    gioiTinh,
    giaThue: Math.max(Number(sanPham?.baseRentPrice || 0), 180000),
    soNgayMacDinh: 3,
    kichThuoc,
    tinhTrang,
    nhan: suyRaNhan(sanPham, tinhTrang, chiSo),
    moTaNgan:
      sanPham?.description ||
      "Trang phục phù hợp cho buổi chụp ảnh, sự kiện hoặc trải nghiệm mặc cổ phục tại cửa hàng.",
    luotQuanTam: Number(sanPham?.likeCount || 0) + 20,
    ngayCapNhat: sanPham?.updatedAt || sanPham?.createdAt || new Date().toISOString(),
  };
};

const doiNgayThue = (soNgay) => {
  const batDau = new Date();
  const ketThuc = new Date();
  ketThuc.setDate(batDau.getDate() + Math.max(Number(soNgay || 1) - 1, 0));

  return {
    batDau: batDau.toISOString(),
    ketThuc: ketThuc.toISOString(),
  };
};

const namTrongKhoangGia = (giaThue, khoangGia) => {
  if (!khoangGia) return true;
  if (khoangGia === "duoi-300") return giaThue < 300000;
  if (khoangGia === "300-500") return giaThue >= 300000 && giaThue <= 500000;
  if (khoangGia === "tren-500") return giaThue > 500000;
  return true;
};

const giaoTichKichThuoc = (kichThuocSanPham = [], kichThuocDangLoc = []) => {
  if (kichThuocDangLoc.length === 0) return true;
  return kichThuocDangLoc.some((kichThuoc) => kichThuocSanPham.includes(kichThuoc));
};

const toggleGiaTriMang = (danhSach = [], giaTri) =>
  danhSach.includes(giaTri)
    ? danhSach.filter((item) => item !== giaTri)
    : [...danhSach, giaTri];

function NhomBoLoc({ tieuDe, children }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">{tieuDe}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function NutLuaChon({ dangChon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
        dangChon
          ? "border-amber-400 bg-amber-50 text-stone-900"
          : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
      }`}
    >
      {children}
    </button>
  );
}

function NutKichThuoc({ dangChon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
        dangChon
          ? "border-stone-900 bg-stone-900 text-white"
          : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
      }`}
    >
      {children}
    </button>
  );
}

function TheSanPham({ sanPham, onXemNhanh, onThueNgay }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative overflow-hidden">
        <img
          src={sanPham.anh}
          alt={sanPham.ten}
          className="h-72 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {sanPham.nhan.map((nhan) => (
            <span
              key={nhan}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                nhan === "Nổi bật"
                  ? "bg-rose-100 text-rose-700"
                  : nhan === "Còn ít"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {nhan}
            </span>
          ))}
        </div>
        <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-stone-700 backdrop-blur">
          {sanPham.tinhTrang}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            {sanPham.danhMuc}
          </p>
          <h3 className="line-clamp-2 text-xl font-semibold text-stone-900">{sanPham.ten}</h3>
          <p className="line-clamp-2 text-sm leading-6 text-stone-500">{sanPham.moTaNgan}</p>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-stone-900">{dinhDangTien(sanPham.giaThue)}</p>
            <p className="text-sm text-stone-500">/ {sanPham.soNgayMacDinh} ngày</p>
          </div>
          <div className="rounded-2xl bg-stone-50 px-3 py-2 text-right text-xs text-stone-500">
            <div>Giới tính</div>
            <div className="mt-1 font-semibold text-stone-800">{sanPham.gioiTinh}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {sanPham.kichThuoc.map((kichThuoc) => (
            <span
              key={kichThuoc}
              className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600"
            >
              {kichThuoc}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onXemNhanh(sanPham)}
            className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
          >
            Xem chi tiết
          </button>
          <button
            type="button"
            onClick={() => onThueNgay(sanPham)}
            className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
          >
            Thuê ngay
          </button>
        </div>
      </div>
    </article>
  );
}

function BoLocThue({
  boLocTam,
  capNhatBoLocTam,
  apDungBoLoc,
  xoaBoLoc,
  dongBoLoc,
  hienNutDong = false,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">Bộ lọc</p>
          <h2 className="mt-1 text-xl font-semibold text-stone-900">Tìm nhanh trang phục phù hợp</h2>
        </div>
        {hienNutDong && (
          <button
            type="button"
            onClick={dongBoLoc}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600"
          >
            Đóng
          </button>
        )}
      </div>

      <NhomBoLoc tieuDe="Tìm kiếm">
        <input
          type="text"
          value={boLocTam.timKiem}
          onChange={(e) => capNhatBoLocTam("timKiem", e.target.value)}
          placeholder="Tìm theo tên trang phục"
          className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-900"
        />
      </NhomBoLoc>

      <NhomBoLoc tieuDe="Danh mục">
        {LUA_CHON_DANH_MUC.map((danhMuc) => (
          <NutLuaChon
            key={danhMuc}
            dangChon={boLocTam.danhMuc === danhMuc}
            onClick={() =>
              capNhatBoLocTam("danhMuc", boLocTam.danhMuc === danhMuc ? "" : danhMuc)
            }
          >
            {danhMuc}
          </NutLuaChon>
        ))}
      </NhomBoLoc>

      <NhomBoLoc tieuDe="Giới tính">
        {LUA_CHON_GIOI_TINH.map((gioiTinh) => (
          <NutLuaChon
            key={gioiTinh}
            dangChon={boLocTam.gioiTinh === gioiTinh}
            onClick={() =>
              capNhatBoLocTam("gioiTinh", boLocTam.gioiTinh === gioiTinh ? "" : gioiTinh)
            }
          >
            {gioiTinh}
          </NutLuaChon>
        ))}
      </NhomBoLoc>

      <NhomBoLoc tieuDe="Khoảng giá thuê">
        {LUA_CHON_KHOANG_GIA.map((khoangGia) => (
          <NutLuaChon
            key={khoangGia.value || "tat-ca"}
            dangChon={boLocTam.khoangGia === khoangGia.value}
            onClick={() => capNhatBoLocTam("khoangGia", khoangGia.value)}
          >
            {khoangGia.label}
          </NutLuaChon>
        ))}
      </NhomBoLoc>

      <NhomBoLoc tieuDe="Kích thước">
        <div className="flex flex-wrap gap-2">
          {LUA_CHON_KICH_THUOC.map((kichThuoc) => (
            <NutKichThuoc
              key={kichThuoc}
              dangChon={boLocTam.kichThuoc.includes(kichThuoc)}
              onClick={() =>
                capNhatBoLocTam("kichThuoc", toggleGiaTriMang(boLocTam.kichThuoc, kichThuoc))
              }
            >
              {kichThuoc}
            </NutKichThuoc>
          ))}
        </div>
      </NhomBoLoc>

      <NhomBoLoc tieuDe="Tình trạng">
        {LUA_CHON_TINH_TRANG.map((tinhTrang) => (
          <NutLuaChon
            key={tinhTrang}
            dangChon={boLocTam.tinhTrang === tinhTrang}
            onClick={() =>
              capNhatBoLocTam("tinhTrang", boLocTam.tinhTrang === tinhTrang ? "" : tinhTrang)
            }
          >
            {tinhTrang}
          </NutLuaChon>
        ))}
      </NhomBoLoc>

      <div className="grid grid-cols-2 gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={xoaBoLoc}
          className="rounded-2xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400"
        >
          Xóa bộ lọc
        </button>
        <button
          type="button"
          onClick={apDungBoLoc}
          className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}

function XemNhanhSanPham({
  sanPham,
  kichThuocDaChon,
  soNgayThue,
  onChonKichThuoc,
  onDoiSoNgay,
  onDong,
  onThemVaoGio,
  onDatLichThuDo,
}) {
  if (!sanPham) return null;

  const giaMoiNgay = Math.round(sanPham.giaThue / sanPham.soNgayMacDinh);
  const tongTien = giaMoiNgay * soNgayThue;
  const tienCoc = Math.round(tongTien * 0.5);
  const tienConLai = tongTien - tienCoc;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[32px] bg-white shadow-2xl">
        <button
          type="button"
          onClick={onDong}
          className="absolute right-5 top-5 z-10 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-sm"
        >
          Đóng
        </button>

        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[340px] bg-stone-100">
            <img src={sanPham.anh} alt={sanPham.ten} className="h-full w-full object-cover" />
          </div>

          <div className="space-y-6 p-6 lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Xem nhanh sản phẩm
              </p>
              <h3 className="mt-2 text-3xl font-semibold text-stone-900">{sanPham.ten}</h3>
              <p className="mt-3 text-sm leading-7 text-stone-500">{sanPham.moTaNgan}</p>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-stone-500">Giá thuê gợi ý</p>
                  <p className="mt-1 text-3xl font-bold text-stone-900">
                    {dinhDangTien(sanPham.giaThue)}
                  </p>
                  <p className="text-sm text-stone-500">/ {sanPham.soNgayMacDinh} ngày</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-stone-400">Tình trạng</div>
                  <div className="mt-1 text-sm font-semibold text-stone-800">{sanPham.tinhTrang}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-stone-700">Chọn size</label>
              <div className="flex flex-wrap gap-2">
                {sanPham.kichThuoc.map((kichThuoc) => (
                  <button
                    key={kichThuoc}
                    type="button"
                    onClick={() => onChonKichThuoc(kichThuoc)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                      kichThuocDaChon === kichThuoc
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
                    }`}
                  >
                    {kichThuoc}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="so-ngay-thue" className="text-sm font-semibold text-stone-700">
                Chọn số ngày thuê
              </label>
              <input
                id="so-ngay-thue"
                type="number"
                min="1"
                max="14"
                value={soNgayThue}
                onChange={(e) => onDoiSoNgay(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-900"
              />
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                Giải thích chi phí
              </h4>
              <div className="mt-4 space-y-3 text-sm text-stone-700">
                <div className="flex items-center justify-between gap-4">
                  <span>Giá thuê</span>
                  <strong>{dinhDangTien(tongTien)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Tiền cọc 50%</span>
                  <strong>{dinhDangTien(tienCoc)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Thanh toán tại cửa hàng</span>
                  <strong>{dinhDangTien(tienConLai)}</strong>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-amber-800">
                Khách cần đặt cọc trước 50% để giữ trang phục.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onThemVaoGio}
                className="rounded-2xl bg-stone-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-stone-700"
              >
                Thêm vào giỏ thuê
              </button>
              <button
                type="button"
                onClick={onDatLichThuDo}
                className="rounded-2xl border border-stone-300 px-5 py-4 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
              >
                Đặt lịch thử đồ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  const navigate = useNavigate();
  const { addItem } = useRentalCart();
  const [duLieuNguon, setDuLieuNguon] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [sapXep, setSapXep] = useState("pho-bien");
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [boLocTam, setBoLocTam] = useState(BO_LOC_MAC_DINH);
  const [boLocDaApDung, setBoLocDaApDung] = useState(BO_LOC_MAC_DINH);
  const [dangMoBoLocDiDong, setDangMoBoLocDiDong] = useState(false);
  const [sanPhamDangXem, setSanPhamDangXem] = useState(null);
  const [kichThuocDangChon, setKichThuocDangChon] = useState("");
  const [soNgayThue, setSoNgayThue] = useState(3);
  const [thongBao, setThongBao] = useState("");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = "vi";
    }
  }, []);

  useEffect(() => {
    let dangConHieuLuc = true;

    const taiDuLieu = async () => {
      try {
        setDangTai(true);

        const taiTrang = async (trang) => {
          const thamSo = new URLSearchParams({
            purpose: "fitting",
            limit: "50",
            page: String(trang),
            lang: "vi",
          });

          const phanHoi = await fetch(`/api/products?${thamSo.toString()}`);
          const duLieu = phanHoi.ok ? await phanHoi.json() : { data: [], pagination: { totalPages: 1 } };

          return {
            danhSach: Array.isArray(duLieu?.data) ? duLieu.data : [],
            tongSoTrang: Number(duLieu?.pagination?.totalPages || 1),
          };
        };

        const trangDau = await taiTrang(1);
        const cacLoiHua = [];

        for (let trang = 2; trang <= trangDau.tongSoTrang; trang += 1) {
          cacLoiHua.push(taiTrang(trang));
        }

        const cacTrangConLai = cacLoiHua.length > 0 ? await Promise.all(cacLoiHua) : [];
        const danhSachTuApi = [trangDau, ...cacTrangConLai]
          .flatMap((trang) => trang.danhSach)
          .map(chuyenSanPhamTuApi);

        if (!dangConHieuLuc) return;

        setDuLieuNguon(danhSachTuApi.length > 0 ? danhSachTuApi : DU_LIEU_MAU);
      } catch {
        if (dangConHieuLuc) {
          setDuLieuNguon(DU_LIEU_MAU);
        }
      } finally {
        if (dangConHieuLuc) {
          setDangTai(false);
        }
      }
    };

    taiDuLieu();

    return () => {
      dangConHieuLuc = false;
    };
  }, []);

  useEffect(() => {
    const boHenGio = window.setTimeout(() => {
      setThongBao("");
    }, 2400);

    return () => {
      window.clearTimeout(boHenGio);
    };
  }, [thongBao]);

  const capNhatBoLocTam = (tenTruong, giaTri) => {
    setBoLocTam((truocDo) => ({
      ...truocDo,
      [tenTruong]: giaTri,
    }));
  };

  const apDungBoLoc = () => {
    setBoLocDaApDung(boLocTam);
    setTrangHienTai(1);
    setDangMoBoLocDiDong(false);
  };

  const xoaBoLoc = () => {
    setBoLocTam(BO_LOC_MAC_DINH);
    setBoLocDaApDung(BO_LOC_MAC_DINH);
    setTrangHienTai(1);
    setDangMoBoLocDiDong(false);
  };

  const danhSachDaLoc = useMemo(() => {
    const ketQuaLoc = duLieuNguon.filter((sanPham) => {
      const hopTimKiem =
        !boLocDaApDung.timKiem ||
        boDau(sanPham.ten).includes(boDau(boLocDaApDung.timKiem));

      const hopDanhMuc =
        !boLocDaApDung.danhMuc || sanPham.danhMuc === boLocDaApDung.danhMuc;

      const hopGioiTinh =
        !boLocDaApDung.gioiTinh || sanPham.gioiTinh === boLocDaApDung.gioiTinh;

      const hopKhoangGia = namTrongKhoangGia(sanPham.giaThue, boLocDaApDung.khoangGia);

      const hopKichThuoc = giaoTichKichThuoc(
        sanPham.kichThuoc,
        boLocDaApDung.kichThuoc
      );

      const hopTinhTrang =
        !boLocDaApDung.tinhTrang || sanPham.tinhTrang === boLocDaApDung.tinhTrang;

      return (
        hopTimKiem &&
        hopDanhMuc &&
        hopGioiTinh &&
        hopKhoangGia &&
        hopKichThuoc &&
        hopTinhTrang
      );
    });

    const daSapXep = [...ketQuaLoc];

    if (sapXep === "moi-nhat") {
      daSapXep.sort(
        (a, b) => new Date(b.ngayCapNhat).getTime() - new Date(a.ngayCapNhat).getTime()
      );
    } else if (sapXep === "gia-tang") {
      daSapXep.sort((a, b) => a.giaThue - b.giaThue);
    } else if (sapXep === "gia-giam") {
      daSapXep.sort((a, b) => b.giaThue - a.giaThue);
    } else {
      daSapXep.sort((a, b) => {
        const diemA = a.luotQuanTam + (a.nhan.includes("Nổi bật") ? 30 : 0);
        const diemB = b.luotQuanTam + (b.nhan.includes("Nổi bật") ? 30 : 0);
        return diemB - diemA;
      });
    }

    return daSapXep;
  }, [duLieuNguon, boLocDaApDung, sapXep]);

  const tongSoTrang = Math.max(
    1,
    Math.ceil(danhSachDaLoc.length / SO_SAN_PHAM_MOI_TRANG)
  );

  const danhSachHienThi = useMemo(() => {
    const batDau = (trangHienTai - 1) * SO_SAN_PHAM_MOI_TRANG;
    return danhSachDaLoc.slice(batDau, batDau + SO_SAN_PHAM_MOI_TRANG);
  }, [danhSachDaLoc, trangHienTai]);

  useEffect(() => {
    if (trangHienTai > tongSoTrang) {
      setTrangHienTai(1);
    }
  }, [trangHienTai, tongSoTrang]);

  const moXemNhanh = (sanPham) => {
    setSanPhamDangXem(sanPham);
    setKichThuocDangChon(sanPham.kichThuoc[0] || "M");
    setSoNgayThue(sanPham.soNgayMacDinh || 3);
  };

  const themVaoGio = () => {
    if (!sanPhamDangXem) return;

    const ngay = Math.max(Number(soNgayThue || 1), 1);
    const lich = doiNgayThue(ngay);
    const giaMoiNgay = Math.round(sanPhamDangXem.giaThue / sanPhamDangXem.soNgayMacDinh);

    addItem(
      {
        _id: sanPhamDangXem.id,
        name: sanPhamDangXem.ten,
        images: [sanPhamDangXem.anh],
        imageUrl: sanPhamDangXem.anh,
        baseSalePrice: 0,
      },
      {
        color: "Mặc định",
        size: kichThuocDangChon || sanPhamDangXem.kichThuoc[0] || "M",
        rentPrice: giaMoiNgay * ngay,
        rentStartDate: lich.batDau,
        rentEndDate: lich.ketThuc,
      }
    );

    setThongBao("Đã thêm vào giỏ thuê");
    setSanPhamDangXem(null);
  };

  const datLichThuDo = () => {
    if (!sanPhamDangXem) return;
    navigate(`/products/${sanPhamDangXem.id}`);
  };

  return (
    <div className="product-page">
      <Header active="booking" />

      <main className="product-page-main">
        <div className="site-shell">
          <section className="rounded-[32px] border border-white/60 bg-gradient-to-br from-[#f6efe5] via-white to-[#efe1cf] p-6 shadow-[0_20px_60px_rgba(71,45,22,0.08)] lg:p-10">
            <div className="text-sm text-stone-500">
              <Link to="/" className="transition hover:text-stone-900">
                Trang chủ
              </Link>
              <span className="mx-2">/</span>
              <span>Thuê trang phục</span>
            </div>
            <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                  Bộ sưu tập thuê
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900 lg:text-5xl">
                  Thuê trang phục
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600 lg:text-lg">
                  Chọn mẫu trang phục phù hợp cho buổi chụp ảnh, sự kiện hoặc lễ hội.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.22em] text-stone-400">Mẫu đang có</div>
                  <div className="mt-2 text-2xl font-semibold text-stone-900">{duLieuNguon.length}</div>
                </div>
                <div className="rounded-2xl bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.22em] text-stone-400">Đang hiển thị</div>
                  <div className="mt-2 text-2xl font-semibold text-stone-900">{danhSachDaLoc.length}</div>
                </div>
                <div className="rounded-2xl bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.22em] text-stone-400">Đặt cọc trước</div>
                  <div className="mt-2 text-2xl font-semibold text-stone-900">50%</div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <BoLocThue
                  boLocTam={boLocTam}
                  capNhatBoLocTam={capNhatBoLocTam}
                  apDungBoLoc={apDungBoLoc}
                  xoaBoLoc={xoaBoLoc}
                />
              </div>
            </aside>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                      Danh sách sản phẩm
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-stone-900">
                      Tìm thấy {danhSachDaLoc.length} sản phẩm
                    </h2>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => setDangMoBoLocDiDong(true)}
                      className="rounded-2xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 lg:hidden"
                    >
                      Bộ lọc
                    </button>

                    <label className="flex items-center gap-3 rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-600">
                      <span className="whitespace-nowrap font-medium">Sắp xếp</span>
                      <select
                        value={sapXep}
                        onChange={(e) => {
                          setSapXep(e.target.value);
                          setTrangHienTai(1);
                        }}
                        className="bg-transparent text-sm font-semibold text-stone-900 outline-none"
                      >
                        {LUA_CHON_SAP_XEP.map((muc) => (
                          <option key={muc.value} value={muc.value}>
                            {muc.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              {dangTai ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, chiSo) => (
                    <div
                      key={chiSo}
                      className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
                    >
                      <div className="h-64 animate-pulse bg-stone-200" />
                      <div className="space-y-3 p-5">
                        <div className="h-3 w-24 animate-pulse rounded-full bg-stone-200" />
                        <div className="h-5 w-3/4 animate-pulse rounded-full bg-stone-200" />
                        <div className="h-4 w-full animate-pulse rounded-full bg-stone-100" />
                        <div className="h-4 w-2/3 animate-pulse rounded-full bg-stone-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : danhSachHienThi.length === 0 ? (
                <div className="rounded-[32px] border border-dashed border-stone-300 bg-white p-10 text-center shadow-sm">
                  <h3 className="text-2xl font-semibold text-stone-900">
                    Không tìm thấy trang phục phù hợp
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-stone-500">
                    Hãy thử điều chỉnh lại bộ lọc để xem thêm các mẫu đang có sẵn tại cửa hàng.
                  </p>
                  <button
                    type="button"
                    onClick={xoaBoLoc}
                    className="mt-6 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {danhSachHienThi.map((sanPham) => (
                      <TheSanPham
                        key={sanPham.id}
                        sanPham={sanPham}
                        onXemNhanh={moXemNhanh}
                        onThueNgay={moXemNhanh}
                      />
                    ))}
                  </div>

                  <div className="flex flex-col items-center justify-between gap-3 rounded-[28px] border border-stone-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
                    <p className="text-sm text-stone-500">
                      Trang {trangHienTai} / {tongSoTrang}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={trangHienTai <= 1}
                        onClick={() => setTrangHienTai((truocDo) => Math.max(1, truocDo - 1))}
                        className="rounded-2xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Trước
                      </button>
                      <button
                        type="button"
                        disabled={trangHienTai >= tongSoTrang}
                        onClick={() =>
                          setTrangHienTai((truocDo) => Math.min(tongSoTrang, truocDo + 1))
                        }
                        className="rounded-2xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </main>

      {dangMoBoLocDiDong && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 p-4 backdrop-blur-sm lg:hidden">
          <div className="ml-auto h-full max-w-sm overflow-auto rounded-[28px] bg-stone-50 p-4 shadow-2xl">
            <BoLocThue
              boLocTam={boLocTam}
              capNhatBoLocTam={capNhatBoLocTam}
              apDungBoLoc={apDungBoLoc}
              xoaBoLoc={xoaBoLoc}
              dongBoLoc={() => setDangMoBoLocDiDong(false)}
              hienNutDong
            />
          </div>
        </div>
      )}

      <XemNhanhSanPham
        sanPham={sanPhamDangXem}
        kichThuocDaChon={kichThuocDangChon}
        soNgayThue={Math.max(Number(soNgayThue || 1), 1)}
        onChonKichThuoc={setKichThuocDangChon}
        onDoiSoNgay={(giaTri) => setSoNgayThue(Math.max(Number(giaTri || 1), 1))}
        onDong={() => setSanPhamDangXem(null)}
        onThemVaoGio={themVaoGio}
        onDatLichThuDo={datLichThuDo}
      />

      {thongBao && (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {thongBao}
        </div>
      )}
    </div>
  );
}
