# Hệ thống Bạn bè Kỳ Thủ

Hệ thống được thiết kế cho tài khoản **học sinh** và sử dụng Cloud Firestore đã có trong dự án.

## Bật tính năng trên Firebase

**Cần thực hiện sau khi cập nhật GitHub Pages:** GitHub chỉ triển khai HTML/CSS/JavaScript; file `firestore.rules` không được tự động xuất bản lên Firebase.

1. Mở Firebase Console của dự án `hoccovua-1f26d`.
2. Chọn **Firestore Database → Rules**.
3. Sao chép **toàn bộ nội dung** file [`firestore.rules`](./firestore.rules) mới nhất của repository vào trình chỉnh sửa. Không chỉ sao chép bốn khối mới vì còn các quyền truy cập cũ của lớp học và tiến độ.
4. Nhấn **Publish** và chờ Firebase báo cập nhật thành công.
5. Thử bằng **hai tài khoản học sinh đã được kích hoạt**.

## Thử nghiệm hai tài khoản

1. Tài khoản A nhấn **👥 Bạn bè**, sao chép mã `KT...` của mình.
2. Tài khoản B mở **👥 Bạn bè**, nhập mã A, nhấn **Gửi lời mời**.
3. Tài khoản A chọn tab **Lời mời**, nhấn **Đồng ý**.
4. Hai bên đều thấy nhau trong tab **Bạn bè**.
5. Khi học sinh đã vào Khám phá và tiến độ được lưu, bạn bè có thể xem số sao, số vùng, số huy hiệu và hình nhân vật. Không chia sẻ tên thật hay chi tiết cá nhân.
6. Kiểm tra **Từ chối**, **Chặn**, **Hủy lời mời**, **Hủy kết bạn**, cùng việc tải lại trang vẫn giữ danh sách.

## An toàn

- Không hỗ trợ tìm kiếm tất cả học sinh, tin nhắn riêng, tình trạng trực tuyến hoặc trao đổi thông tin liên hệ.
- Mã kết bạn dài 12 ký tự, ngẫu nhiên, không phải tên đăng nhập.
- Người nhận phải chấp thuận; ai bị từ chối hoặc chặn sẽ không gửi lại được qua cùng quan hệ.
- Danh sách bạn bè riêng tư; thông tin thành tích chỉ cho phép **bạn bè đã xác nhận** đọc.
- Giáo viên nên hướng dẫn học sinh chỉ trao đổi mã với bạn quen biết.

## Các bộ sưu tập Firestore

- `friendSettings`: mã của chính chủ tài khoản.
- `friendDirectory`: tra mã chính xác để tìm ID; cấm liệt kê danh sách.
- `friendships`: trạng thái pending/accepted/declined/blocked, chỉ người trong quan hệ được đọc.
- `friendPublicProfiles`: nhân vật, sao, vùng, huy hiệu; không chứa tên, tuổi, địa chỉ.

**Lưu ý:** Mời bạn chơi một ván cờ trực tiếp và nhắn tin tự do **chưa có trong phiên bản này**. Tính năng Kết bạn không thay đổi cơ chế phòng học giáo viên–học sinh hiện có.
