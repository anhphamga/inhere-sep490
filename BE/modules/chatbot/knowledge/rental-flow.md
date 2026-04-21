# Quy Trình Thuê Đồ Chi Tiết

## 1) Điểm bắt đầu từ giao diện
- Người dùng chọn sản phẩm thuê trong giỏ thuê tại trang giỏ hàng.
- Hệ thống yêu cầu có ngày bắt đầu và ngày kết thúc cho từng sản phẩm.
- Giao diện gọi API tạo đơn thuê, sau đó gọi API đặt cọc.

## 2) API chính cho đơn thuê
- API tạo đơn thuê mới.
- API khách thanh toán cọc.
- API khách hủy đơn.
- API nhân viên hoặc quản trị viên xác nhận đơn đã cọc.
- API nhân viên hoặc quản trị viên xác nhận khách nhận đồ.
- API chuyển trạng thái sang chờ trả.
- API nhân viên hoặc quản trị viên xác nhận trả đồ.
- API đánh dấu khách không đến nhận.
- API chốt đơn về Returned để xử lý phần còn lại.
- API hoàn tất xử lý tiền cọc, trả thế chấp.
- API hoàn tất giặt, có thể kết thúc đơn.

## 3) Trạng thái đơn thuê
Danh sách trạng thái trong model đơn thuê:
- Draft
- PendingDeposit
- Deposited
- Confirmed
- WaitingPickup
- Renting
- WaitingReturn
- Returned
- Completed
- NoShow
- Late
- Compensation
- Cancelled

## 4) Luồng trạng thái thường gặp
- Tạo đơn: PendingDeposit.
- Khách đặt cọc thành công: Deposited.
- Nhân viên xác nhận đơn: Confirmed.
- Xác nhận khách nhận đồ và thế chấp: Renting.
- Đến giai đoạn trả đồ: WaitingReturn.
- Xác nhận trả đồ: Returned hoặc giữ WaitingReturn nếu chưa trả đủ.
- Hoàn tất xử lý giặt và tài chính: Completed.

## 5) Quy tắc quan trọng khi tạo đơn thuê
- Hệ thống kiểm tra sản phẩm có khả dụng theo khoảng thời gian thuê.
- Nếu sản phẩm trùng lịch thuê với đơn khác chưa hủy thì không cho thuê.
- Nếu không truyền mã thực thể sản phẩm, hệ thống tự chọn thực thể phù hợp theo điều kiện.
- Tiền cọc mặc định khoảng 50% tổng tiền nếu không truyền giá trị cụ thể.

## 6) Quy tắc thế chấp khi nhận đồ
- Bắt buộc có thông tin thế chấp khi nhận đồ.
- Loại hợp lệ: CCCD, GPLX, Cà vẹt hoặc tiền mặt.
- Nếu là tiền mặt thì phải có số tiền hợp lệ.
- Nếu là giấy tờ thì phải có số giấy tờ.

## 7) Quy tắc trả đồ và phí phát sinh
- Khi trả đồ, hệ thống tính trễ hạn theo số ngày và hệ số phí trễ.
- Có thể phát sinh phí hư hỏng theo tình trạng đồ trả.
- Trạng thái thực thể sản phẩm chuyển sang sửa chữa hoặc giặt tùy tình trạng.
- Sau khi hoàn tất giặt, thực thể sản phẩm sẽ trở lại trạng thái sẵn sàng.

## 8) Quy tắc xử lý tiền cọc khi kết thúc đơn
- Nếu cọc lớn hơn tổng tiền phải thu, phần dư được hoàn.
- Nếu cọc nhỏ hơn tổng tiền phải thu, tạo giao dịch thu thêm.
- Nếu bằng nhau, cọc được cấn trừ hết.
- Sau cùng, tài sản thế chấp đang giữ sẽ được trả lại.

## 9) Các API tra cứu đơn thuê
- API để khách xem lịch sử đơn thuê của mình.
- API xem chi tiết một đơn thuê.
- API để nhân viên hoặc quản trị viên xem toàn bộ đơn thuê.
