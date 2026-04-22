# Quy Trình Mua Hàng Chi Tiết

## 1) Điểm bắt đầu từ giao diện
- Người dùng thêm sản phẩm vào giỏ mua trên trang giỏ hàng.
- Điền thông tin nhận hàng: tên, điện thoại, email, địa chỉ.
- Chọn phương thức thanh toán: thanh toán khi nhận hàng hoặc chuyển khoản.

## 2) API thanh toán
- API thanh toán cho người dùng đã đăng nhập.
- API thanh toán cho khách vãng lai đã xác minh.

## 3) Kiểm tra đầu vào quan trọng
- Giỏ mua không được rỗng.
- Tên, email, địa chỉ bắt buộc.
- Số điện thoại và email phải đúng định dạng.
- Danh sách sản phẩm phải hợp lệ và không ở trạng thái ngừng bán.

## 4) Luồng thanh toán khách vãng lai
- Khách xác minh bằng OTP số điện thoại hoặc mã email.
- Hệ thống trả mã xác minh phiên sau khi xác minh thành công.
- Thanh toán khách vãng lai bắt buộc kèm mã xác minh phiên còn hiệu lực.
- Sau khi tạo đơn thành công, phiên xác minh được đánh dấu đã dùng.

## 5) Trạng thái đơn mua
Danh sách trạng thái trong hệ thống:
- Draft
- PendingPayment
- PendingConfirmation
- Paid
- Confirmed
- Shipping
- Completed
- Cancelled
- Returned
- Unpaid
- Failed
- Refunded

## 6) Trạng thái mặc định khi tạo đơn
- Đơn mua được tạo với trạng thái PendingConfirmation.
- Hệ thống lưu lịch sử trạng thái trong trường lịch sử.

## 7) Luồng chuyển trạng thái đơn mua cho quản trị viên
Các chuyển trạng thái tiêu biểu:
- Draft -> PendingPayment, PendingConfirmation, Cancelled
- PendingPayment -> Paid, Failed, Cancelled
- PendingConfirmation -> Confirmed, Cancelled
- Paid -> Confirmed, Refunded
- Confirmed -> Shipping, Completed, Cancelled
- Shipping -> Completed, Returned
- Completed -> Refunded
- Returned -> Refunded
- Unpaid -> PendingPayment, Cancelled
- Failed -> PendingPayment, Cancelled

## 8) API quản trị đơn mua
- API cho quản trị viên xem danh sách đơn mua.
- API cho quản trị viên cập nhật trạng thái đơn mua.

## 9) Dữ liệu trả về cho quản trị
- Nhãn trạng thái và lớp hiển thị theo siêu dữ liệu trạng thái.
- Danh sách trạng thái kế tiếp theo bảng chuyển trạng thái.
- Dữ liệu lịch sử đã chuẩn hóa để hiển thị dòng thời gian.

## 10) Email xác nhận
- Hệ thống có gửi email xác nhận đơn sau khi thanh toán.
- Nếu gửi email lỗi, đơn vẫn được tạo thành công.
