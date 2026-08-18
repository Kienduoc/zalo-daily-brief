# PROMPT THIẾT KẾ LẠI UX/UI — "THƯ KÝ AI ZALO"

(Copy toàn bộ nội dung dưới đây gửi cho AI/designer)

---

Bạn là một Senior Product Designer + Frontend Developer. Hãy thiết kế lại toàn bộ UX/UI cho ứng dụng web nội bộ "Thư ký AI Zalo" theo mô tả dưới đây, rồi xuất ra **một file `index.html` hoàn chỉnh duy nhất** (HTML + CSS + JavaScript thuần, không build tool) thay thế được file cũ mà không cần sửa backend.

## 1. Sản phẩm là gì

Ứng dụng chạy trên máy tính cá nhân (localhost:3179, phục vụ bởi Express/Node.js), giúp lãnh đạo doanh nghiệp theo dõi tin nhắn Zalo:
- Kết nối tài khoản Zalo bằng quét mã QR (chỉ ĐỌC tin nhắn, không bao giờ gửi).
- Hệ thống thu tin nhắn nhóm + tin cá nhân 24/7, đọc cả ảnh và tài liệu đính kèm.
- AI (đăng nhập OAuth bằng tài khoản Claude) tóm tắt tin nhắn thành báo cáo 4 mục:
  1. Cần anh phê duyệt / quyết định
  2. Liên quan trực tiếp đến anh
  3. Điểm nghẽn
  4. Chỉ cần biết
- Người dùng bấm nút tạo báo cáo theo khoảng thời gian; báo cáo là file HTML có ô tick "đã xử lý" từng việc.
- Brief tự động lúc 18:00 các ngày làm việc.

## 2. Người dùng mục tiêu

- Lãnh đạo/quản lý người Việt, 30–60 tuổi, KHÔNG rành công nghệ.
- Dùng trên desktop là chính (Chrome/Edge trên Windows), thỉnh thoảng xem trên điện thoại.
- Kỳ vọng: mở lên nhìn phát hiểu ngay trạng thái, thao tác ít bước nhất, chữ to rõ, tiếng Việt 100%.

## 3. Nhận diện thương hiệu (bắt buộc giữ)

- Màu chủ đạo: xanh lá `#6CB545`; màu phụ: xanh dương `#00AEEF`.
- Chân trang bắt buộc có dòng: `© 2026 Nguyễn Đức Kiên — 0981689892. Nghiêm cấm sao chép dưới mọi hình thức.`
- Tên ứng dụng: "Thư ký AI Zalo".
- Hồ sơ người đăng nhập (avatar tròn + tên + SĐT) đặt ở GÓC TRÊN BÊN PHẢI header, ngang hàng tên ứng dụng.

## 4. Cấu trúc chức năng hiện tại (giữ đủ, được phép sắp xếp lại thông minh hơn)

1. **Kết nối Zalo**: trạng thái (chưa kết nối / chờ quét QR / đang kết nối / đã kết nối / lỗi), ảnh QR + hướng dẫn 3 bước quét bằng điện thoại, nút "Kết nối Zalo của tôi", nút "Đăng nhập lại (QR mới)".
2. **Bộ não AI**: trạng thái sẵn sàng/chưa (kèm email + tổ chức), nút "Kiểm tra lại", nút "Đăng nhập AI (OAuth)" khi chưa đăng nhập.
3. **Số liệu tài khoản** (tự quét 5 phút/lần + nút "Quét lại ngay"): số nhóm đang tham gia, hội thoại đánh dấu chưa đọc, tin đã thu hôm nay, tin mới từ lần quét trước, giờ brief tự động, thời điểm quét gần nhất.
4. **Tạo báo cáo**: nút chọn nhanh (Hôm nay / Sáng nay / Chiều nay / 24 giờ qua / Hôm qua / 3 ngày qua / Tuần qua), 2 ô datetime-local Từ/Đến, checkbox "Gửi thêm vào email" (disable khi chưa cấu hình SMTP), nút "Tạo báo cáo" có trạng thái loading, hiển thị kết quả (số tin, số đính kèm đã đọc, link mở báo cáo) hoặc lỗi thân thiện.
5. **Báo cáo đã tạo**: danh sách file của TÀI KHOẢN đang đăng nhập (tên dạng `2026.08.18_00_00-den-2026.08.18_23_59(Zalo)`), thời điểm tạo, bấm mở tab mới.
6. **Màn hình khóa** (khi server đặt APP_KEY): overlay nhập Key bản quyền, báo lỗi khi sai, nhớ 90 ngày.
7. Ghi chú cố định: "chỉ báo cáo được tin thu từ lúc kết nối trở đi, không đọc lại lịch sử cũ".

## 5. Hợp đồng API (KHÔNG được đổi — UI mới phải gọi đúng)

- `GET /api/status` → `{ status: "chua_ket_noi"|"cho_quet"|"dang_ket_noi"|"da_ket_noi"|"loi", qrImage (dataURL|null), account, error, msgToday, smtpConfigured, summaryCron, scanMinutes, scanBusy, scan: { scannedAt, profile:{name,phone,avatar}, groupCount, unreadMarkGroups, unreadMarkUsers, capturedToday, newSinceLastScan, errors[] }|null, ai: { provider, ready, email?, org?, plan?, detail, checkedAt } }`
  - Trả HTTP 401 + `{locked:true}` khi chưa nhập Key.
- `POST /api/connect` → bắt đầu luồng QR (poll /api/status để lấy qrImage).
- `POST /api/relogin` → ngắt phiên, xóa session, phát QR mới.
- `POST /api/scan` → quét lại ngay, trả `{ok, scan}` (đợi quét thật xong).
- `POST /api/ai/check` → kiểm tra lại đăng nhập AI.
- `POST /api/ai/login` → mở cửa sổ đăng nhập OAuth, trả `{ok, note}`.
- `POST /api/report` body `{from:"YYYY-MM-DDTHH:mm", to, email:boolean}` → `{ok, count, enriched, label, relUrl, mailed}` hoặc `{ok:false, note}`; HTTP 429 khi đang bận.
- `GET /api/reports` → `[{name, url, mtime, kind}]`.
- `POST /api/unlock` body `{key}` → `{ok}` hoặc 401 `{ok:false, note}`.
- Poll trạng thái ~2.5 giây/lần.

## 6. Yêu cầu UX nâng cấp (đây là lý do thiết kế lại)

- **Ưu tiên hành động chính**: người dùng vào app chủ yếu để (a) liếc trạng thái hệ thống có ổn không, (b) bấm 1 nút ra báo cáo. Thiết kế phải làm 2 việc này nổi bật nhất.
- **Trạng thái hệ thống nhìn 2 giây là hiểu**: gộp Zalo + AI + thu tin thành một dải "sức khỏe hệ thống" trực quan (xanh = ổn, vàng = cần thao tác, đỏ = lỗi kèm nút sửa ngay).
- **Luồng lần đầu (onboarding)**: máy mới → hướng người dùng đi từng bước 1→2→3 (kết nối Zalo → đăng nhập AI → tạo báo cáo đầu tiên), bước nào xong đánh dấu xong.
- **Giảm chữ, tăng trực quan**: icon + số to; các cảnh báo chỉ hiện khi liên quan.
- **Loading có cảm xúc**: tạo báo cáo mất 30–120 giây — cần progress/skeleton + thông điệp thay đổi ("Đang đọc 79 tin...", "Đang đọc ảnh đính kèm...", "AI đang tóm tắt...") thay vì spinner câm.
- **Danh sách báo cáo**: nhóm theo ngày, tên hiển thị thân thiện ("Hôm nay 00:00 → 23:59") thay vì tên file thô; vẫn giữ được link mở file.
- **Responsive**: desktop 2 cột hợp lý, mobile 1 cột.
- **Dark mode**: tùy chọn, tự theo hệ điều hành.
- Không dùng framework nặng; được phép dùng CSS hiện đại (grid, custom properties). KHÔNG tải tài nguyên từ CDN ngoài (app chạy offline nội bộ).

## 7. Sản phẩm bàn giao

1. File `index.html` hoàn chỉnh (HTML + CSS + JS thuần, tiếng Việt), gọi đúng API ở mục 5, xử lý đủ mọi trạng thái ở mục 4.
2. Mô tả ngắn các quyết định thiết kế chính (5–10 dòng).
3. (Tùy chọn) đề xuất style lại trang báo cáo HTML (khung 4 mục + ô tick "đã xử lý" + thanh tiến độ "Đã xử lý x/y việc" — phải giữ nguyên logic localStorage hiện có).

Ràng buộc kỹ thuật cuối: mọi id phần tử mà JS thao tác có thể tự đặt lại, miễn là logic gọi API và poll trạng thái giữ nguyên hành vi như mô tả.
