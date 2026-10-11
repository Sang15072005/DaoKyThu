VƯƠNG QUỐC CỜ VUA — TÀI KHOẢN HỌC VIÊN
========================================
Đây là bộ mã nguồn, CHƯA triển khai lên Firebase của bạn.

TÍNH NĂNG
- Giữ giao diện cũ, bài tập và đối kháng.
- Đăng nhập bằng mã học viên HV001 (hoặc email giáo viên).
- Giáo viên tạo/khóa/đặt lại mật khẩu học viên qua Cloud Functions.
- Tạo lớp, giao bài, xem kết quả và học viên lưu tiến độ.

CÀI ĐẶT (máy có Node.js)
1. Cài Firebase CLI: npm install -g firebase-tools
2. firebase login
3. cd thư_mục_giải_nén
4. firebase use hoccovua-1f26d
5. Trong Firebase Console -> Authentication -> Sign-in method: bật Email/Password.
6. Firebase Console -> Authentication -> Settings -> Authorized domains: thêm tên miền Hosting của bạn.
7. Trong thư mục functions: npm install
8. Firebase Functions yêu cầu gói Blaze/billing và quyền triển khai phù hợp.
9. Từ thư mục dự án: firebase deploy --only functions,firestore:rules,hosting

TẠO GIÁO VIÊN ĐẦU TIÊN (THỰC HIỆN THỦ CÔNG TRONG CONSOLE)
- Authentication -> Users -> Add user: tạo email giáo viên và mật khẩu mạnh.
- Sao chép UID của giáo viên.
- Firestore -> collection 'users' -> document ID đúng bằng UID:
  role (string): teacher
  name (string): tên giáo viên
  active (boolean): true
- Đăng nhập bằng email giáo viên.
- Tạo lớp (ví dụ CB01) trước khi tạo học viên thuộc lớp đó.
- Tạo học viên, giao mã HV001 và mật khẩu qua kênh riêng.

CẢNH BÁO BẢO MẬT
- Không chia sẻ mật khẩu học viên trong nhóm công khai.
- Firestore Rules mẫu hạn chế truy cập tài khoản; tuy nhiên phòng 'rooms' đang cho mọi người dùng đã xác thực đọc/ghi. Cần nâng cấp quyền phòng theo thành viên trước khi triển khai thực tế nhiều lớp.
- Tiến độ do máy học viên gửi, KHÔNG phải điểm thi chống gian lận.
- Để bảo vệ dữ liệu học sinh, cần rà soát quy tắc truy cập, quyền riêng tư, đồng ý của phụ huynh và kiểm thử trước khi dùng thật.
- Không mở file HTML bằng file:// để vận hành thực tế; dùng Hosting HTTPS.
- Mã đăng nhập được ánh xạ thành HV001@students.hoccovua.invalid; đây là định danh nội bộ, không nhận email xác minh/khôi phục mật khẩu. Giáo viên dùng chức năng đặt lại mật khẩu.
- Nếu dự án Firebase đang có dữ liệu/quy tắc đang chạy, KHÔNG triển khai đè firestore.rules trước khi sao lưu và kiểm tra tương thích với các tính năng khác.

GIỚI HẠN
- Chưa có kiểm thử end-to-end trên Firebase thực.
- Phần giao bài mới hiển thị danh sách; chưa có nhấn vào bài để tự mở đúng bài.
- Chưa có cơ chế xác thực độc lập rằng bài thực sự đã hoàn thành (không dùng cho kiểm tra chính thức).
