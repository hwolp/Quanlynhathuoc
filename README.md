# Quản lý nhà thuốc — PharmaCare

Ứng dụng React + FastAPI, lưu dữ liệu bằng SQLite.

- [FE](FE/README.md): giao diện, cấu hình kết nối và kiểm thử trình duyệt.
- [BE](BE/README.md): API, database và hướng dẫn khởi chạy.
- [Testing](Testing/README.md): kiểm thử tự động bằng Python Playwright.

Chạy backend trong `BE` ở cổng 8000 và frontend trong `FE` ở cổng 3000 theo hướng dẫn từng thư mục. Database được tạo từ mã nguồn khi backend khởi động; không cần file database mock.

Các thư mục dependencies, môi trường Python, database local, bản build và kết quả kiểm thử được loại khỏi Git bằng `.gitignore`.
