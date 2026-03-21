# inhere-sep490
INHERE – Hội An Costume Rental &amp; Sales Management System. Capstone project focusing on rental workflows, deposit, return handling, and AI-supported customer experience.
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
PORT=9000
NODE_ENV=development
JWT_ACCESS_SECRET=replace_with_access_secret
JWT_REFRESH_SECRET=replace_with_refresh_secret
OWNER_NAME=System Owner
OWNER_EMAIL=owner@inhere.local
OWNER_PHONE=0900000000
OWNER_PASSWORD=ChangeMe123!
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
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

Backend sẽ chạy tại: http://localhost:9000

### 3. Cài đặt Frontend

```bash
cd ../FE
npm install
```

Tạo file `.env` trong thư mục FE:
```env
VITE_API_BASE_URL=http://localhost:9000/api
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
- **Customer** - Khách hàng

## 🔐 Auth & Profile APIs

- `POST /api/auth/signup` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất (cần Bearer token)
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `GET /api/users/me` - Lấy profile
- `PUT /api/users/me` - Cập nhật profile
- `PUT /api/users/me/change-password` - Đổi mật khẩu
- `DELETE /api/users/me` - Xóa profile

Ghi chú:
- `signup` luôn tạo `customer`.
- `owner` là tài khoản seed sẵn từ biến môi trường.

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

## Backend Translation (VI -> EN)

### Environment variables (BE/.env)

```env
PORT=9000
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=global
# Preferred: path to service account json
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
```

You can also provide credentials by setting `GOOGLE_APPLICATION_CREDENTIALS` at OS level.

### Google Cloud setup

1. Create/select a GCP project.
2. Enable `Cloud Translation API`.
3. Create Service Account with Translation permissions.
4. Download JSON key.
5. Set `GOOGLE_APPLICATION_CREDENTIALS` to that JSON path.

### Run local

```bash
cd BE
npm install
npm run dev
```

### Translation API

- `POST /api/translate`
- `POST /api/translate/batch`

Both endpoints are rate-limited (`60 req/min/IP`) and cached in MongoDB collection `translations`.

## Vercel Deploy (Frontend)

Project da co san `vercel.json` o root de:
- Build tu thu muc `FE`
- Output `FE/dist`
- Rewrite tat ca route ve `index.html` (React Router SPA)

Can thiet lap environment variable tren Vercel:
- `VITE_API_BASE_URL=https://<your-backend-domain>/api`

Luu y:
- Backend Express (`BE`) hien tai nen deploy rieng (Render/Railway/VPS).
- Frontend tren Vercel se goi API qua `VITE_API_BASE_URL`.
