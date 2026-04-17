
# 📱 Hệ Thống Điểm Danh Thông Minh ESP32 (BLE Web App)

[Version 1.0] | [Platform: Mobile Web] | [Hardware: ESP32 BLE] | [Status: NCKH 2026]

Dự án Nghiên cứu khoa học (NCKH): Xây dựng hệ thống điểm danh tự động kết hợp phần cứng định vị (ESP32 Bluetooth Low Energy) và điện toán đám mây (Google Cloud), dành riêng cho Phân hiệu Trường Đại học Giao thông Vận tải tại TP.HCM (UTC2).

## 🚀 Tính Năng Nổi Bật

Hệ thống được thiết kế với ưu tiên hàng đầu là trải nghiệm người dùng (UX) và bảo mật chống gian lận (Anti-Cheat):

- Xác thực Vị trí Vật lý (BLE Challenge-Response): Sử dụng Web Bluetooth API giao tiếp với ESP32 để chứng minh sinh viên thực sự có mặt tại phòng học.
- Chống Gian lận Thiết bị (Anti-Cheat): Tích hợp FingerprintJS để định danh thiết bị (Device ID) duy nhất. Chặn truy cập từ PC/Laptop, bắt buộc sử dụng Smartphone/Tablet. Vô hiệu hóa F12, DevTools và Context Menu để bảo vệ logic xử lý.
- Đồng bộ Cloud Real-time: Dữ liệu điểm danh được đẩy trực tiếp lên hệ thống quản lý Google Sheets thông qua Google Apps Script.
- Giao diện Neumorphism: Giao diện hiện đại, trực quan với khả năng chuyển đổi tức thời giữa Chế độ Sáng (Light Mode) và Chế độ Tối (Dark Mode) theo chuẩn Carbon Design.
- Cảnh báo Ngoại tuyến: Tự động khóa hệ thống và thông báo khi thiết bị mất kết nối Internet.

## ⚙️ Kiến Trúc Hệ Thống

1. Frontend (Client): Mobile Web App (HTML, CSS, Vanilla JS) chạy trên trình duyệt của sinh viên.
2. Hardware (Edge/Gateway): Module ESP32 phát tín hiệu Bluetooth định danh khu vực lớp học.
3. Backend (Cloud): Google Apps Script tiếp nhận API và ghi dữ liệu vào Google Sheets.

## 🛠️ Yêu Cầu Cài Đặt (Setup)

### 1. Môi trường Frontend (Web)
Do chính sách bảo mật của trình duyệt đối với Web Bluetooth API, ứng dụng web này bắt buộc phải được chạy trên môi trường HTTPS.
- Khuyến nghị: Deploy mã nguồn lên GitHub Pages, Vercel hoặc Netlify.

### 2. Cấu hình Phần cứng (ESP32)
Phần cứng ESP32 cần được nạp Firmware quét BLE với các thông số khớp với Web App:
- BLE Device Name: TRAM-DIEM-DANH
- Service UUID: 19b10000-e8f2-537e-4f6c-d104768a1214
- Characteristic UUID: 19b10001-e8f2-537e-4f6c-d104768a1214

### 3. Cấu hình Backend (API)
1. Triển khai Google Apps Script và lấy URL Web App.
2. Mở file index.html, tìm đến dòng cấu hình API và thay thế URL:
const scriptURL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

## 📝 Hướng Dẫn Sử Dụng
1. Giảng viên cấp nguồn cho trạm ESP32 tại phòng học.
2. Sinh viên truy cập vào đường link Web App bằng điện thoại.
3. Nhập Mã số sinh viên (MSSV).
4. Nhấn "XÁC NHẬN CÓ MẶT". Hệ thống sẽ tự động quét vân tay trình duyệt, bắt tay với trạm BLE và đẩy dữ liệu lên Cloud.
5. Kiểm tra trạng thái và lịch sử điểm danh ngay trên màn hình.

## 👨‍💻 Tác Giả & Bản Quyền
- Tác giả: 
- Đơn vị: Phân hiệu Trường Đại học Giao thông Vận tải tại TP.HCM (UTC2)
- Bản quyền: © 2026 Nghiên cứu khoa học. Phân phối cho mục đích giáo dục.
```
