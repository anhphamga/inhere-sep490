# 🎭 InHere Frontend - Traditional Costume Rental

Frontend application for InHere - Traditional Vietnamese costume rental service in Hoi An Ancient Town.

## 🚀 Tech Stack

- **React 18** - UI Library
- **Vite** - Build tool & dev server
- **React Router** - Routing (khi cài đặt)
- **Axios** - HTTP client (khi cài đặt)
- **CSS3** - Styling

## 📁 Cấu trúc thư mục

```
FE/
├── src/
│   ├── api/              # Cấu hình API (axios instance)
│   ├── services/         # API calls thuần túy (productService, userService...)
│   ├── hooks/            # Custom hooks - Logic xử lý (useAuth, useProducts...)
│   ├── context/          # React Context API - State global (AuthContext, ThemeContext...)
│   ├── store/            # State management - Zustand/Redux (nếu cần)
│   ├── components/       # UI Components tái sử dụng (Header, Footer, Button...)
│   ├── pages/            # Pages - UI trang hoàn chỉnh (HomePage, ProductPage...)
│   ├── utils/            # Helper functions (validators, formatters...)
│   ├── assets/           # Static files (images, fonts...)
│   ├── App.jsx           # Main App component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Public assets
├── .env                  # Environment variables
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
└── package.json          # Dependencies
```

## 🔧 Setup & Installation

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` trong thư mục `FE/`:

```env
VITE_API_URL=http://localhost:9000/api
```

### 3. Chạy development server

```bash
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

### 4. Build production

```bash
npm run build
```

### 5. Preview production build

```bash
npm run preview
```

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Chạy dev server với hot reload |
| `npm run build` | Build production |
| `npm run preview` | Preview production build |
| `npm run lint` | Check ESLint errors |

## 🏗️ Quy tắc tổ chức code

### **Components** - UI tái sử dụng
```javascript
// components/Button/Button.jsx
export const Button = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};
```

### **Pages** - Trang hoàn chỉnh
```javascript
// pages/HomePage/HomePage.jsx
import { Button } from '../../components/Button/Button';
export default HomePage;
```

### **Services** - API calls
```javascript
// services/productService.js
import api from '../api/axios';
export const productService = {
  getAllProducts: () => api.get('/products'),
};
```

### **Hooks** - Logic xử lý
```javascript
// hooks/useProducts.js
import { useState, useEffect } from 'react';
import { productService } from '../services/productService';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  // ... logic
  return { products };
};
```

### **Context** - State global
```javascript
// context/AuthContext.jsx
export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  // ... logic
  return <AuthContext.Provider>{children}</AuthContext.Provider>;
};
```

## 🌐 API Integration

Backend API: `http://localhost:9000/api`

Các endpoint chính:

- `GET /api/users` - Lấy danh sách users
- `GET /api/blogs` - Lấy danh sách blogs
- (Thêm các endpoints khác khi phát triển)

## 📝 Ghi chú

- **Components**: Chứa UI components nhỏ, tái sử dụng (Button, Card, Header, Footer...)
- **Pages**: Chứa UI trang hoàn chỉnh, kết hợp các components
- **Services**: Chỉ chứa API calls thuần túy, không xử lý logic
- **Hooks**: Chứa logic xử lý, state management, side effects
- **Context**: Chứa state global (user info, theme, language...)
- **Utils**: Chứa helper functions (validate, format, calculate...)

## 🤝 Contributing

1. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
2. Commit changes: `git commit -m 'Add some feature'`
3. Push to branch: `git push origin feature/ten-tinh-nang`
4. Tạo Pull Request

## 📄 License

Private project - InHere Team
