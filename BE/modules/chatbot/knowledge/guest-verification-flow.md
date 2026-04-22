# Quy Trình Xác Minh Khách Vãng Lai

## 1) Mục tiêu
- Cho phép khách chưa đăng nhập vẫn có thể thanh toán đơn mua.
- Bổ sung lớp xác minh để hạn chế spam và dữ liệu giả.

## 2) Endpoint xác minh
- API gửi mã OTP qua số điện thoại.
- API xác minh mã OTP qua số điện thoại.
- API gửi mã xác minh qua email.
- API xác minh mã qua email.

## 3) Quy tắc mã xác minh
- Mã gồm 6 chữ số.
- Thời hạn mỗi mã: 5 phút.
- Tối đa gửi lại: 3 lần.
- Tối đa thử xác minh sai: 5 lần.

## 4) Trạng thái và dữ liệu lưu
Tập dữ liệu GuestVerification lưu:
- method: phone hoặc email
- target: số điện thoại hoặc email mục tiêu
- codeHash: mã đã băm
- expiresAt: thời điểm hết hạn
- resendCount: số lần gửi lại
- attempts: số lần nhập sai
- verified: đã xác minh hay chưa
- consumedAt: đã dùng để thanh toán hay chưa

## 5) Kết quả khi xác minh thành công
- Hệ thống trả mã xác minh phiên.
- Giao diện dùng mã xác minh phiên để gọi API thanh toán khách vãng lai.
- Mã không hợp lệ hoặc hết hạn sẽ bị từ chối thanh toán.
