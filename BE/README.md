# Backend — FastAPI + SQLite

API cho hệ thống quản lý quầy thuốc. Mã nguồn nằm trong `app/`, chia thành các package người dùng, danh mục và giao dịch. FE đọc/ghi dữ liệu qua API; backend lưu bằng SQLAlchemy và SQLite.

## Khởi chạy

Chạy từ thư mục `BE`:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- Swagger: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health
- API prefix: `/api/v1`
- Database mặc định: `BE/quan_ly_quay_thuoc.db`, được tự tạo khi khởi động từ `BE`.

Backend khởi tạo dữ liệu mẫu theo SRS khi database chưa có vai trò. Giữ `app/core/seed.py` để ứng dụng và bộ kiểm thử có dữ liệu ban đầu; các file database local không được đưa lên Git.

Đặt biến môi trường `DATABASE_URL` để dùng database khác. Tham khảo `.env.example`; ứng dụng đọc biến môi trường của tiến trình, không tự nạp file `.env`.

## Kiểm thử

```powershell
.venv\Scripts\python.exe tests/test_api_contract.py
```

Bộ kiểm thử có ghi dữ liệu: đặt `DATABASE_URL` trỏ tới database kiểm thử riêng trước khi chạy. Kiểm thử FE/BE bằng trình duyệt: chạy `npm run test:integration` trong `FE`; script tự tạo database tạm.

Xem hướng dẫn FE và tài khoản mẫu tại [../FE/README.md](../FE/README.md). Cơ chế token hiện tại là mô phỏng; việc dọn file không thay đổi cơ chế xác thực này.
