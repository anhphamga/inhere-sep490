# Hướng Dẫn Tri Thức Cho Chatbot

Chatbot này hoạt động theo quy trình RAG:
1. Nhận câu hỏi từ người dùng
2. Tạo biểu diễn vector cho câu hỏi
3. Truy xuất top-k ngữ cảnh liên quan từ kho vector
4. Ghép ngữ cảnh đã truy xuất vào prompt
5. Gọi mô hình Groq để sinh câu trả lời
6. Trả về câu trả lời kèm thông tin ngữ cảnh tham chiếu

Các ràng buộc vận hành:
- Khóa API chỉ được sử dụng ở phía máy chủ
- Tự động thử lại theo cơ chế lùi thời gian khi gặp lỗi 429 hoặc 5xx
- Áp dụng thời gian chờ cho các lời gọi dịch vụ bên ngoài
- Bắt buộc kiểm tra và làm sạch dữ liệu đầu vào

Cách giữ câu trả lời chính xác:
- Luôn cập nhật tài liệu tri thức theo thay đổi của hệ thống
- Chạy nạp lại tri thức sau khi nội dung thay đổi
- Ưu tiên các đoạn nội dung theo từng chủ đề rõ ràng, tránh văn bản dài và nhiễu
