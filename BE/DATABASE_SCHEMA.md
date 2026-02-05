# Database Schema Documentation

## Tổng quan
Dự án InHere sử dụng MongoDB với Mongoose ODM. Database bao gồm 17 collections để quản lý hệ thống cho thuê và bán trang phục.

## Collections

### 1. User (Người dùng)
- **role**: Owner | Staff | Customer
- **name**: Tên người dùng
- **phone**: Số điện thoại (unique)
- **email**: Email (unique)
- **passwordHash**: Mật khẩu đã hash
- **status**: Active | Locked
- **avatarUrl**: URL ảnh đại diện
- **createdAt**: Ngày tạo

### 2. Product (Sản phẩm)
- **name**: Tên sản phẩm
- **category**: Danh mục
- **size**: Kích thước
- **color**: Màu sắc
- **description**: Mô tả
- **images**: Mảng URL hình ảnh
- **baseRentPrice**: Giá thuê cơ bản
- **baseSalePrice**: Giá bán cơ bản

### 3. ProductInstance (Thực thể sản phẩm)
- **productId**: Tham chiếu Product
- **conditionLevel**: New | Good | Used | Damaged
- **conditionScore**: Điểm tình trạng (0-100)
- **lifecycleStatus**: Available | Rented | Washing | Repair | Lost
- **currentRentPrice**: Giá thuê hiện tại
- **currentSalePrice**: Giá bán hiện tại
- **note**: Ghi chú

### 4. PricingRule (Quy tắc giá)
- **applyFor**: Rent | Sale
- **conditionLevel**: New | Good | Used | Damaged
- **modifyType**: Percentage | Fixed
- **modifyValue**: Giá trị điều chỉnh
- **isHot**: Sản phẩm hot
- **priority**: Độ ưu tiên
- **scope**: Global | Product | Category
- **productId**: Tham chiếu Product (optional)

### 5. RentOrder (Đơn thuê)
- **customerId**: Tham chiếu User (khách hàng)
- **staffId**: Tham chiếu User (nhân viên)
- **status**: Draft | PendingDeposit | Deposited | Confirmed | WaitingPickup | Renting | Waiting
- **rentStartDate**: Ngày bắt đầu thuê
- **rentEndDate**: Ngày kết thúc thuê
- **depositAmount**: Số tiền đặt cọc
- **remainingAmount**: Số tiền còn lại
- **washingFee**: Phí giặt
- **damageFee**: Phí hư hỏng
- **totalAmount**: Tổng tiền
- **createdAt**: Ngày tạo

### 6. RentOrderItem (Chi tiết đơn thuê)
- **orderId**: Tham chiếu RentOrder
- **productInstanceId**: Tham chiếu ProductInstance
- **baseRentPrice**: Giá thuê cơ bản
- **finalPrice**: Giá cuối cùng
- **condition**: Tình trạng
- **appliedRuleIds**: Các rule đã áp dụng
- **selectLevel**: Cấp độ đã chọn
- **size**: Kích thước
- **color**: Màu sắc
- **note**: Ghi chú

### 7. SaleOrder (Đơn bán)
- **customerId**: Tham chiếu User
- **staffId**: Tham chiếu User
- **productInstanceId**: Tham chiếu ProductInstance
- **status**: Draft | PendingPayment | Paid | Confirmed | Shipping | Completed | Cancelled | Returned | Unpaid | Failed | Refunded
- **paymentMethod**: COD | Online
- **discountAmount**: Số tiền giảm giá
- **shippingFee**: Phí ship
- **totalAmount**: Tổng tiền
- **shippingAddress**: Địa chỉ giao hàng
- **shippingPhone**: SĐT nhận hàng
- **createdAt**: Ngày tạo

### 8. SaleOrderItem (Chi tiết đơn bán)
- **orderId**: Tham chiếu SaleOrder
- **productId**: Tham chiếu Product
- **unitPrice**: Đơn giá
- **quantity**: Số lượng
- **size**: Kích thước
- **color**: Màu sắc
- **note**: Ghi chú

### 9. Payment (Thanh toán)
- **orderType**: Rent | Sale
- **orderId**: ID đơn hàng (dynamic ref)
- **amount**: Số tiền
- **method**: COD | Online | Cash
- **status**: Pending | Paid | Failed
- **transactionCode**: Mã giao dịch
- **paidAt**: Thời gian thanh toán

### 10. Collateral (Tài sản thế chấp)
- **orderId**: Tham chiếu RentOrder
- **type**: ID | Cash | CCCD | GPLX
- **documentNumber**: Số giấy tờ
- **documentImageUrl**: URL ảnh giấy tờ
- **receiveAt**: Thời gian nhận
- **returnedAt**: Thời gian trả
- **status**: Returned | Deducted

### 11. Deposit (Đặt cọc)
- **orderId**: Tham chiếu RentOrder
- **amount**: Số tiền
- **method**: Online | Cash
- **status**: Held | Refunded
- **paidAt**: Thời gian thanh toán

### 12. ReturnRecord (Biên bản trả)
- **orderId**: Tham chiếu RentOrder
- **returnDate**: Ngày trả
- **condition**: Normal | Dirty | Damaged
- **washingFee**: Phí giặt
- **damageFee**: Phí hư hỏng
- **note**: Ghi chú
- **staffId**: Tham chiếu User (nhân viên)

### 13. Alert (Thông báo)
- **type**: PickupSoon | ReturnSoon | Late | New | Seen | Done
- **targetType**: RentOrder | SaleOrder | Product
- **targetId**: ID đối tượng (dynamic ref)
- **status**: New | Seen | Done
- **createdAt**: Ngày tạo

### 14. Blog
- **authorId**: Tham chiếu User
- **status**: Draft | Public
- **content**: Nội dung
- **createdAt**: Ngày tạo

### 15. Voucher (Mã giảm giá)
- **code**: Mã voucher (unique)
- **discountType**: Percentage | Fixed
- **discountValue**: Giá trị giảm
- **minOrderValue**: Giá trị đơn tối thiểu
- **expiryDate**: Ngày hết hạn
- **usageLimit**: Giới hạn sử dụng
- **usedCount**: Số lần đã dùng
- **isActive**: Trạng thái kích hoạt

### 16. InventoryHistory (Lịch sử tồn kho)
- **productInstanceId**: Tham chiếu ProductInstance
- **status**: Trạng thái
- **startDate**: Ngày bắt đầu
- **endDate**: Ngày kết thúc
- **note**: Ghi chú

### 17. FittingBooking (Đặt lịch thử đồ)
- **customerId**: Tham chiếu User
- **date**: Ngày hẹn
- **timeSlot**: Khung giờ
- **note**: Ghi chú
- **status**: Pending | Confirmed
- **staffId**: Tham chiếu User
- **createdAt**: Ngày tạo

## Relationships (Quan hệ)

### User relationships:
- 1 User có nhiều RentOrder (as customer)
- 1 User có nhiều SaleOrder (as customer)
- 1 User có nhiều Blog (as author)
- 1 User có nhiều ReturnRecord (as staff)
- 1 User có nhiều FittingBooking (as customer)

### Product relationships:
- 1 Product có nhiều ProductInstance
- 1 Product có nhiều PricingRule

### Order relationships:
- 1 RentOrder có nhiều RentOrderItem
- 1 RentOrder có nhiều Collateral
- 1 RentOrder có nhiều Deposit
- 1 RentOrder có nhiều Payment
- 1 RentOrder có 1 ReturnRecord

- 1 SaleOrder có nhiều SaleOrderItem
- 1 SaleOrder có nhiều Payment

### ProductInstance relationships:
- 1 ProductInstance có nhiều RentOrderItem
- 1 ProductInstance có nhiều InventoryHistory

## Hướng dẫn chạy

1. Cài đặt dependencies:
```bash
cd BE
npm install
```

2. Cấu hình MongoDB trong file `.env`:
```
MONGO_URI=mongodb://localhost:27017/inhere
PORT=5000
NODE_ENV=development
```

3. Chạy server:
```bash
npm start
```

Hoặc chạy ở mode development (cần cài nodemon):
```bash
npm install -g nodemon
npm run dev
```

## API Endpoint mặc định
- `GET /` - Welcome message

Bạn có thể thêm các routes cho từng model trong thư mục `routes/`.
