# Thư ký AI Zalo

Phần mềm chạy trên máy tính: lắng nghe (CHỈ ĐỌC) tin nhắn nhóm + tin cá nhân Zalo,
đọc cả ảnh/tài liệu đính kèm, tóm tắt bằng AI theo góc nhìn người quản lý, xuất báo cáo
bằng nút bấm và brief tự động 18:00.

**© 2026 Nguyễn Đức Kiên — 0981689892. Nghiêm cấm sao chép dưới mọi hình thức.**

## Cài sang máy mới (3 bước)

1. Chép cả thư mục này sang máy mới (KHÔNG cần chép `node_modules`, `data`, `logs`).
2. Đúp chuột **`CaiDat.bat`** — tự kiểm tra Node.js, cài thư viện, tạo cấu hình.
3. Đúp chuột **`ThuKyAI.bat`** — trình duyệt mở giao diện, bấm "Kết nối Zalo" và quét QR.

Bộ não AI mặc định dùng **tài khoản Claude (subscription)** qua Claude Code CLI:
máy mới chỉ cần gõ `claude` một lần trong cửa sổ lệnh để đăng nhập (bộ cài tự cài CLI nếu thiếu).
Không cần API key, không qua máy chủ trung gian.

## Sử dụng hằng ngày

- Mở phần mềm: đúp chuột `ThuKyAI.bat` (giữ cửa sổ đen chạy — đóng là dừng thu tin).
- Giao diện: `http://localhost:3179`
  - **Kết nối Zalo**: quét QR 1 lần, tự nhớ cho lần sau. Hiện hồ sơ (tên, SĐT, avatar),
    số nhóm đang tham gia, tin đã thu, tự quét 5 phút/lần (nút "Quét lại ngay").
  - **Tạo báo cáo**: nút nhanh (Hôm nay / Sáng nay / Chiều nay / 24h / Hôm qua / 3 ngày / Tuần qua)
    hoặc tự chọn khoảng giờ. Báo cáo phân 4 mục: Cần phê duyệt → Liên quan trực tiếp → Điểm nghẽn → Chỉ cần biết.
  - **Báo cáo đã tạo**: bấm tên để mở lại.
- Brief tự động 18:00 Thứ 2–6 (đổi trong `.env`, dòng `SUMMARY_CRON`).

## Cấu hình (`.env`)

| Dòng | Ý nghĩa |
|---|---|
| `LLM_PROVIDER` | `claude-code` (tài khoản Claude, mặc định) hoặc `openai` (endpoint HTTP) |
| `CLAUDE_MODEL` | tùy chọn, vd `haiku` để tiết kiệm quota |
| `SMTP_*`, `MAIL_*` | điền để tự gửi báo cáo vào email |
| `SUMMARY_CRON` | lịch brief tự động |
| `SCAN_MINUTES` | chu kỳ quét tài khoản (mặc định 5 phút) |
| `APP_KEY` | đặt mã để khóa phần mềm — người mở phải nhập Key đúng |

## Lưu ý quan trọng

1. **Chỉ đọc**: phần mềm không bao giờ gửi tin, trả lời hay tương tác trên Zalo.
2. **Không đọc được lịch sử cũ**: chỉ tóm tắt tin thu được từ lúc kết nối trở đi.
3. **Không mở Zalo Web** (trình duyệt) bằng cùng tài khoản khi phần mềm chạy — Zalo chỉ cho
   một phiên web, mở là phần mềm mất kết nối. Zalo điện thoại dùng bình thường.
4. **Rủi ro khóa nick**: dùng thư viện Zalo không chính thức — nên hiểu là có rủi ro,
   khuyến nghị tài khoản phụ nếu chỉ cần theo dõi nhóm.
5. `.env`, `data/`, `logs/` chứa bí mật + nội dung chat — không chia sẻ, không commit.
