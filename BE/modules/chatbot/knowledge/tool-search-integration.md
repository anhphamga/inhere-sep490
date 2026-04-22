# Tích Hợp Công Cụ Tìm Kiếm Cho Chatbot

## Chức năng mới (module chatbot)

- API tìm kiếm theo thực thể nghiệp vụ cho chatbot.
- API hội thoại có tích hợp gọi công cụ tìm kiếm.

## Cấu trúc dữ liệu đầu vào của công cụ

```json
{
  "entity": "user",
  "query": "customer@gmail.com",
  "filters": {
    "status": "active",
    "dateFrom": "2026-01-01T00:00:00.000Z",
    "dateTo": "2026-03-20T23:59:59.999Z",
    "page": 1,
    "limit": 10
  },
  "requestId": "trace-123"
}
```

## Ví dụ phản hồi thành công của công cụ

```json
{
  "requestId": "trace-123",
  "success": true,
  "data": {
    "entity": "user",
    "page": 1,
    "limit": 10,
    "total": 1,
    "records": [
      {
        "id": "67daf4...",
        "name": "Nguyễn Văn A",
        "email": "customer@gmail.com",
        "phone": "0900000000",
        "role": "customer",
        "status": "active",
        "address": "",
        "gender": null,
        "createdAt": "2026-01-02T11:00:00.000Z",
        "updatedAt": "2026-03-01T08:00:00.000Z"
      }
    ]
  }
}
```

## Ví dụ phản hồi lỗi của công cụ

```json
{
  "requestId": "trace-123",
  "success": false,
  "error": {
    "code": "INVALID_TOOL_SEARCH_ENTITY",
    "message": "entity must be one of allowed values"
  }
}
```

## Ví dụ phản hồi hội thoại có dùng công cụ

```json
{
  "requestId": "4a9f-...",
  "success": true,
  "data": {
    "answer": "...",
    "intent": "ORDER",
    "toolData": {
      "entity": "order",
      "page": 1,
      "limit": 4,
      "total": 2,
      "records": []
    },
    "contexts": []
  }
}
```

## Hướng dẫn gắn vào hệ thống

Triển khai này chỉ thêm các tệp mới trong module chatbot.
Để kích hoạt khi chạy thực tế, cần gắn `chatbot.tools.routes` và `chatbot.toolflow.routes` vào bộ đăng ký route của ứng dụng.

## Quy tắc bảo mật đã áp dụng

- Bắt buộc người dùng đã xác thực mới được dùng các API công cụ.
- Áp dụng danh sách vai trò cho phép theo cấu hình.
- Vai trò khách hàng chỉ được tìm dữ liệu người dùng hoặc đơn hàng của chính họ.
- Không trả về các trường nhạy cảm như mật khẩu hoặc token.

## Biến môi trường có thể cấu hình

- CHATBOT_TOOL_API_MODE=internal|http
- CHATBOT_TOOL_SEARCH_ENDPOINT
- CHATBOT_TOOL_DEFAULT_PAGE
- CHATBOT_TOOL_DEFAULT_LIMIT
- CHATBOT_TOOL_MAX_LIMIT
- CHATBOT_TOOL_MAX_QUERY_LENGTH
- CHATBOT_TOOL_ALLOWED_ENTITIES
- CHATBOT_TOOL_ALLOWED_ROLES
- CHATBOT_TOOL_USER_SEARCH_FIELDS
- CHATBOT_TOOL_USER_OUTPUT_FIELDS
- CHATBOT_TOOL_USER_ALLOWED_STATUS
- CHATBOT_TOOL_ORDER_SEARCH_FIELDS
- CHATBOT_TOOL_ORDER_OUTPUT_FIELDS
- CHATBOT_TOOL_ORDER_ALLOWED_STATUS
- CHATBOT_TOOL_INTENT_USER_KEYWORDS
- CHATBOT_TOOL_INTENT_ORDER_KEYWORDS
