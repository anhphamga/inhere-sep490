# Tổng Quan Hệ Thống InHere

InHere là hệ thống quản lý cho thuê và bán trang phục.

Ngăn xếp công nghệ chính:
- Phía máy chủ: Node.js, Express, MongoDB
- Phía giao diện: React, Vite

Các nghiệp vụ trọng tâm:
- Luồng đơn thuê (đặt cọc, nhận đồ, trả đồ)
- Luồng đơn bán (thanh toán, giao hàng, hoàn tất)
- Quản lý sản phẩm và từng thực thể sản phẩm
- Quản lý cảnh báo và lịch đặt thử đồ
- Quản lý người dùng (chủ cửa hàng, nhân viên, khách hàng)

Mục tiêu của module chatbot:
- Trả lời câu hỏi dựa trên tri thức đã được nạp vào hệ thống
- Truy xuất ngữ cảnh liên quan bằng độ tương đồng vector
- Sinh câu trả lời cuối cùng thông qua mô hình Groq LLM
