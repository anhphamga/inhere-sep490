# InHere - Hệ thống cho thuê và bán trang phục

Dự án quản lý cho thuê và bán trang phục với React + Vite (Frontend) và Node.js + Express + MongoDB (Backend).

## 📋 Yêu cầu hệ thống

- Node.js v18+ 
- MongoDB v6+
- npm hoặc yarn

## 🚀 Hướng dẫn cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd inhere-sep490
```

### 2. Cài đặt Backend

```bash
cd BE
npm install
```

Tạo file `.env` trong thư mục BE:
```env
MONGO_URI=mongodb://localhost:27017/inhere
PORT=5000
NODE_ENV=development
```

Chạy MongoDB:
```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
```

Khởi động server:
```bash
npm run dev
```

Backend sẽ chạy tại: http://localhost:5000

### 3. Cài đặt Frontend

```bash
cd ../FE
npm install
```

Tạo file `.env` trong thư mục FE:
```env
VITE_API_URL=http://localhost:5000
```

Khởi động development server:
```bash
npm run dev
```

Frontend sẽ chạy tại: http://localhost:5173

## 📦 Công nghệ sử dụng

### Backend
- **Express.js** - Web framework
- **Mongoose** - MongoDB ODM
- **cors** - CORS middleware
- **nodemon** (dev) - Auto-restart server

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router DOM** - Routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling

## 📁 Cấu trúc dự án

```
inhere-sep490/
├── BE/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/           # Controllers (empty - ready for development)
│   ├── middleware/            # Middlewares (empty - ready for development)
│   ├── model/                 # Mongoose models
│   │   ├── User.model.js
│   │   ├── Product.model.js
│   │   ├── RentOrder.model.js
│   │   └── ...
│   ├── routes/                # API routes (empty - ready for development)
│   ├── utils/                 # Utilities (empty - ready for development)
│   ├── .env                   # Environment variables
│   ├── server.js              # Entry point
│   └── package.json
│
└── FE/
    ├── src/
    │   ├── components/        # React components (empty - ready for development)
    │   ├── hooks/             # Custom hooks (empty - ready for development)
    │   ├── pages/             # Page components (empty - ready for development)
    │   ├── services/          # API services (empty - ready for development)
    │   ├── store/             # State management (empty - ready for development)
    │   ├── utils/             # Utility functions (empty - ready for development)
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env                   # Environment variables
    ├── index.html
    ├── tailwind.config.js     # Tailwind config
    ├── vite.config.js         # Vite config
    └── package.json
```

## 🗃️ Database Schema

Xem chi tiết schema tại: [BE/DATABASE_SCHEMA.md](BE/DATABASE_SCHEMA.md)

### Collections đã setup:
- **User** - Người dùng (Owner/Staff/Customer)
- **Product** - Sản phẩm
- **ProductInstance** - Thực thể sản phẩm
- **PricingRule** - Quy tắc giá
- **RentOrder** - Đơn thuê
- **RentOrderItem** - Chi tiết đơn thuê
- **SaleOrder** - Đơn bán
- **SaleOrderItem** - Chi tiết đơn bán
- **Payment** - Thanh toán
- **Collateral** - Tài sản thế chấp
- **Deposit** - Đặt cọc
- **ReturnRecord** - Biên bản trả
- **Alert** - Thông báo
- **Blog** - Bài viết
- **Voucher** - Mã giảm giá
- **InventoryHistory** - Lịch sử tồn kho
- **FittingBooking** - Đặt lịch thử đồ

## 📝 Next Steps

Base project đã được setup với cấu hình cơ bản. Team có thể bắt đầu phát triển:

### Backend:
- Tạo routes trong `routes/`
- Tạo controllers trong `controllers/`
- Thêm middleware trong `middleware/`
- Thêm utilities trong `utils/`

### Frontend:
- Tạo components trong `components/`
- Tạo pages trong `pages/`
- Thêm API services trong `services/`
- Thêm custom hooks trong `hooks/`
- Setup state management trong `store/`

## 👥 User Roles

- **Owner** - Chủ cửa hàng
- **Staff** - Nhân viên
- **Customer** - Khách hàng

## 🤝 Đóng góp

1. Fork repo
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

ISC

---

**Happy Coding! 🎉**
