# Hành Trình Người Dùng Trên Giao Diện

## 1) Các trang chính liên quan mua và thuê
- Trang thanh toán tổng hợp giỏ thuê và giỏ mua.
- Trang chi tiết đơn thuê để đặt cọc, hủy và xử lý trả đồ.
- Trang lịch sử đơn thuê của khách.
- Một số luồng thanh toán thuê và mua được điều hướng về trang thanh toán tổng hợp.

## 2) Luồng thuê trên giao diện
- Người dùng chọn sản phẩm thuê và ngày thuê.
- Tại trang thanh toán, nhấn tạo đơn thuê.
- Giao diện gọi hàm tạo đơn thuê, sau đó gọi hàm đặt cọc.
- Thành công sẽ điều hướng sang trang chi tiết đơn thuê.

## 3) Luồng mua trên giao diện
- Người dùng thêm sản phẩm vào giỏ mua.
- Tại trang thanh toán, điền thông tin nhận hàng và chọn phương thức thanh toán.
- Nếu đã đăng nhập: gọi API thanh toán cho người dùng đã đăng nhập.
- Nếu chưa đăng nhập: mở luồng xác minh khách vãng lai, sau đó gọi API thanh toán cho khách vãng lai.

## 4) Thanh toán khách vãng lai trên giao diện
- Mở cửa sổ xác minh khách vãng lai.
- Chọn xác minh qua số điện thoại hoặc email.
- Nhập mã OTP hoặc mã email.
- Nhận mã xác minh phiên và tiếp tục thanh toán.

## 5) Quy tắc hiển thị và kiểm tra dữ liệu
- Giỏ hàng trống sẽ hiển thị trạng thái rỗng.
- Biểu mẫu mua hàng có kiểm tra họ tên, số điện thoại, email và địa chỉ.
- Tổng thanh toán hiển thị tách phần cọc thuê và phần mua hàng.

## 6) Chức năng quản trị trên giao diện
- Có khu vực quản trị để quản lý đơn mua, sản phẩm, danh mục, khách hàng, nhân viên, ca làm và số liệu phân tích.
- Màn hình quản lý đơn bám theo trạng thái và quy tắc chuyển trạng thái từ phía máy chủ.
