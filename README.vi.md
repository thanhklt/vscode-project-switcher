# Project Switcher

[English](README.md) | **Tiếng Việt**

## Mô tả

> [PLACEHOLDER: Viết mô tả extension của bạn tại đây.]

## Cách sử dụng

### Cài đặt

1. Lấy file đã đóng gói `project-switcher-<version>.vsix` trong `dist/`. Để tự đóng gói từ mã nguồn, chạy `npm ci --ignore-scripts`, sau đó chạy `npm run package`.
2. Trong VS Code desktop hoặc Antigravity IDE, mở **Extensions** → **…** → **Install from VSIX…** rồi chọn file đó.
3. Tải lại editor nếu được yêu cầu, sau đó chọn **Projects** trên thanh Activity Bar.

Cài extension trong từng IDE mà bạn muốn sử dụng.

### Quản lý project

| Thao tác | Cách thực hiện |
| --- | --- |
| Thêm thư mục | Bấm **+ / Add Folders** và chọn một hoặc nhiều thư mục trên máy. |
| Lưu project hiện tại | Mở menu **…** của Projects và chọn **Save Current Project**. Với workspace nhiều thư mục, mỗi thư mục được lưu thành một mục riêng. |
| Mở project | Bấm vào project đã lưu để mở thư mục đó thành workspace trong cửa sổ editor hiện tại. |
| Mở trong cửa sổ mới | Nhấp chuột phải vào project và chọn **Open in New Window**, hoặc bấm biểu tượng ở bên phải project. Cửa sổ mới sử dụng cùng IDE. |
| Tìm kiếm | Bấm biểu tượng tìm kiếm hoặc chạy **Projects: Search Projects** trong Command Palette. Có thể tìm theo tên hoặc đường dẫn. |
| Đổi tên | Nhấp chuột phải vào project và chọn **Rename Project** để đổi tên hiển thị. |
| Xóa khỏi danh sách | Nhấp chuột phải vào project và chọn **Remove from List**. Thư mục và các file trên ổ đĩa được giữ nguyên. |
| Làm mới | Bấm biểu tượng làm mới để tải lại danh sách đã lưu. |

### Cài đặt và lưu trữ dùng chung

| Cài đặt | Mặc định | Chức năng |
| --- | --- | --- |
| `projectSwitcher.openInNewWindow` | `false` | Đặt thành `true` để mặc định mở project trong cửa sổ mới. |
| `projectSwitcher.storagePath` | Để trống | Đặt đường dẫn tuyệt đối tới file JSON lưu danh sách trên máy. Tải lại editor sau khi thay đổi. |

Danh sách mặc định nằm tại `~/.project-switcher/projects.json` (`C:\Users\<user>\.project-switcher\projects.json` trên Windows). VS Code và Antigravity IDE chạy dưới cùng tài khoản hệ điều hành dùng chung file này và tự làm mới khi dữ liệu thay đổi.

Nếu dùng vị trí tùy chỉnh, đặt cùng giá trị `projectSwitcher.storagePath` trong cả hai IDE. Sau khi lưu project đầu tiên, chạy **Projects: Open Saved Projects File** để xem hoặc sao lưu danh sách.

## Phương hướng phát triển

Các ý tưởng phát triển trong tương lai; những tính năng này chưa được triển khai:

- [ ] Phân nhóm project và ghim các thư mục thường dùng.
- [ ] Nhập và xuất danh sách project qua giao diện.
- [ ] Lưu và mở lại toàn bộ file `.code-workspace`.
- [ ] Nghiên cứu hỗ trợ môi trường phát triển từ xa.

## Các vấn đề đã biết

- **Chỉ hỗ trợ thư mục local trên desktop:** Chưa hỗ trợ VS Code Web, SSH, WSL, Dev Containers hoặc lưu toàn bộ file `.code-workspace`. Đặt file JSON dùng chung trên ổ đĩa cục bộ; cơ chế khóa không được thiết kế cho ổ mạng hoặc thư mục đồng bộ cloud.
- **Các phiên đang chạy:** Đổi workspace không tự chuyển terminal hoặc cuộc hội thoại agent hiện có sang project khác. Hãy tạo terminal hoặc phiên agent mới trong project đích.
- **Thư mục đã di chuyển hoặc không còn tồn tại:** Xóa mục cũ khỏi danh sách và thêm lại thư mục ở vị trí mới.
- **Dữ liệu lưu trữ không hợp lệ:** JSON lỗi hoặc phiên bản dữ liệu không được hỗ trợ sẽ gây thông báo lỗi. Extension giữ nguyên file. Sửa hoặc khôi phục file rồi làm mới danh sách.
- **Lỗi danh sách đang bận kéo dài sau sự cố:** Đóng mọi instance VS Code và Antigravity IDE đang dùng danh sách, chỉ xóa thư mục `projects.json.lock` nằm cạnh file lưu trữ, rồi mở lại editor. Giữ nguyên `projects.json`. Nếu dùng tên file lưu trữ tùy chỉnh, thư mục khóa có tên `<file-lưu-trữ>.lock`.

