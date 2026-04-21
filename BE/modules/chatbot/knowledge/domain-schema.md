# Tóm Tắt Lược Đồ Nghiệp Vụ InHere

Tóm tắt các tập dữ liệu chính:
- User: thông tin định danh người dùng và hồ sơ xác thực cho chủ cửa hàng, nhân viên, khách hàng
- Product: thuộc tính sản phẩm như tên, danh mục, kích thước, màu sắc, giá
- ProductInstance: trạng thái vòng đời và chất lượng của từng món đồ thực tế
- PricingRule: quy tắc điều chỉnh giá thuê hoặc giá bán theo ngữ cảnh
- RentOrder + RentOrderItem: dữ liệu đơn thuê và các dòng sản phẩm trong đơn
- SaleOrder + SaleOrderItem: dữ liệu đơn bán và các dòng sản phẩm trong đơn
- Payment: lịch sử thanh toán cho đơn thuê và đơn bán
- Deposit + Collateral: dữ liệu đặt cọc và tài sản thế chấp để giảm rủi ro
- ReturnRecord: biên bản trả đồ, tình trạng và phí phát sinh
- InventoryHistory: lịch sử thay đổi trạng thái tồn kho của từng thực thể sản phẩm
- Alert: dữ liệu thông báo trong hệ thống
- Blog: dữ liệu bài viết nội dung
- Voucher: quy tắc mã giảm giá và chiến dịch khuyến mãi
- FittingBooking: lịch hẹn thử đồ của khách hàng

Một số trạng thái đơn thuê quan trọng:
- Draft
- PendingDeposit
- Deposited
- Confirmed
- WaitingPickup
- Renting
- Waiting

Một số trạng thái đơn bán quan trọng:
- Draft
- PendingPayment
- Paid
- Shipping
- Completed
- Cancelled
- Returned

Các quan hệ dữ liệu điển hình:
- Product -> ProductInstance (một - nhiều)
- RentOrder -> RentOrderItem (một - nhiều)
- SaleOrder -> SaleOrderItem (một - nhiều)
- RentOrder -> Deposit/Collateral/Payment (một - nhiều)
- ProductInstance -> InventoryHistory (một - nhiều)
