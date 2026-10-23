# Đảo Kỳ Thủ — Dùng thử thành viên 7 ngày

## Đã triển khai
- Nút Gói thành viên ở thanh tài khoản, giao diện Premium cho học sinh và Giáo viên Pro cho giáo viên.
- 7 ngày miễn phí, không thẻ ngân hàng, không thanh toán, không tự gia hạn.
- Hủy bất cứ lúc nào, vẫn giữ quyền dùng thử cho đến hết hạn.
- Mỗi UID chỉ có một lượt dùng thử, không được xóa hoặc khởi tạo lại.
- Các Vùng 1–5, phòng học, lớp học và tiến độ không bị thay đổi.
- Chưa cấp quyền thực tế cho các tính năng trả phí chưa xây dựng.

## Bắt buộc triển khai Firestore Rules
Đã cập nhật file firestore.rules trong GitHub cho collection membershipTrials/{uid}. GitHub không tự đồng bộ Rules lên Firebase.
Chạy Firebase CLI đã đăng nhập đúng dự án:

    firebase deploy --only firestore:rules --project hoccovua-1f26d

Hoặc đăng quy tắc tương ứng trong Firebase Console -> Firestore Database -> Rules rồi Publish.
Kiểm thử bằng Firebase Emulator hoặc Rules Playground trước khi áp dụng production.

## Kiểm thử
1. Đăng nhập học sinh -> Gói thành viên -> Bắt đầu dùng thử.
2. Xác nhận Firestore có membershipTrials/<uid>, startedAt, endsAt cách nhau 7 ngày.
3. Nhấn Hủy; cancelled=true và thời hạn không đổi.
4. Tải lại trang; trạng thái được giữ, không được dùng thử lần hai.
5. Kiểm thử tương tự với tài khoản giáo viên.
6. Đảm bảo Vùng 1–5 và dữ liệu lớp/tiến độ không thay đổi.

## Giới hạn bảo mật
- Firestore Rules chặn xóa, ghi đè ngày bắt đầu hoặc khởi tạo lại thử nghiệm.
- Để mở khóa tính năng trả phí thực tế, cần kiểm tra entitlement ở backend hoặc Firestore Security Rules, không tin JS trên trình duyệt.
- Ngày còn lại chỉ để hiển thị; các quyền bảo vệ trong tương lai phải dùng thời gian máy chủ.
- Mỗi UID có một lượt thử theo vai trò đang đăng nhập; hai lượt riêng cho cùng UID yêu cầu schema khác.
- Không có thanh toán, gia hạn tự động hoặc trừ tiền.

## Quản trị viên cấp Premium / Giáo viên Pro

Đã thêm Firebase Callable Functions (functions/index.js):
- membershipAdminCheck: xác nhận UID quản trị viên
- membershipAdminLookup: tìm đúng UID hoặc mã tài khoản (code)
- membershipAdminGrant: cấp mới/gia hạn 7 ngày, 30 ngày, 365 ngày hoặc không thời hạn
- membershipAdminRevoke: thu hồi
- Mọi thay đổi được ghi trong membershipAudit, người dùng không được tự ghi collection này hoặc membershipEntitlements.

**QUAN TRỌNG: Không có quản trị viên mặc định.** Cần thiết lập UID Firebase Authentication của tài khoản chủ sở hữu trong biến môi trường MEMBERSHIP_ADMIN_UIDS tại thư mục functions/.env (KHÔNG COMMIT file này), ví dụ:

    MEMBERSHIP_ADMIN_UIDS=YOUR_FIREBASE_AUTH_UID

Đây là UID lấy từ Firebase Console > Authentication > Users, không phải mã học sinh. Có thể khai báo nhiều UID, phân cách dấu phẩy. Không cấp quyền bằng tên hiển thị hoặc email không xác minh.

Để cài đặt và triển khai Functions (cần dự án Firebase đủ điều kiện hỗ trợ Cloud Functions, có thể phải bật billing):

    cd functions
    npm install
    cd ..
    firebase deploy --only functions,firestore:rules --project hoccovua-1f26d

Tài khoản quản trị viên đăng nhập trên website sẽ thấy phần **Quản trị gói thành viên** trong mục **👑 Gói thành viên** sau khi Functions đã triển khai và UID nằm trong allowlist.

**Giới hạn hiện tại:** Quyền cấp đã lưu an toàn trên Firestore và hiển thị cho người nhận; các chức năng Pro/Premium tương lai vẫn cần tích hợp kiểm tra entitlement ở phía server/rules trước khi mở khóa. Việc cấp quyền không thay đổi vai trò học sinh/giáo viên, không thu tiền, không tạo giao dịch thanh toán.
