# PharmaCare — React + FastAPI

Frontend React đã kết nối backend FastAPI trong `../BE`. Dữ liệu nghiệp vụ được đọc/ghi qua API và lưu trong SQLite. Frontend không dùng seed hoặc localStorage làm dữ liệu thay thế.

## Khởi chạy

Mở hai terminal từ thư mục dự án.

**Backend** (Python 3.10+, môi trường `.venv` hiện có):

```powershell
cd BE
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Nếu chưa có môi trường Python:

```powershell
cd BE
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Frontend** (Node.js 20.19+ hoặc 22+):

```powershell
cd FE
npm install
npm run dev
```

- Giao diện: http://localhost:3000
- Swagger API: http://127.0.0.1:8000/docs
- Database mặc định: `BE/quan_ly_quay_thuoc.db`; chạy backend từ đúng thư mục để dùng database này.

## Cấu hình kết nối

Vite chuyển tiếp `/api` đến `http://127.0.0.1:8000` cho cả dev và preview. Có thể sao chép `.env.example` thành `.env.local` và đổi `API_PROXY_TARGET`. Khởi động lại Vite sau khi đổi cấu hình.

`VITE_API_BASE_URL` mặc định là `/api/v1`. Khi build và triển khai bằng một máy chủ khác, cấu hình reverse proxy `/api` đến backend hoặc đặt biến này thành URL API đầy đủ trước khi build. Nếu khác origin, cấu hình CORS backend phù hợp.

## Tài khoản có trong backend

| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| Admin | admin_clin_01 | admin123 |
| Quản lý | manager_pharma | manager123 |
| Dược sĩ | duocsi_02 | duocsi123 |
| Đã khóa | duocsi_lananh | duocsi123 |

Đây là tài khoản seed backend; nếu tài khoản đã được sửa thì dùng mật khẩu mới.

## Các kết nối

- Đăng nhập: `POST /auth/login`; khôi phục phiên: `GET /auth/me`.
- Tài khoản: `/accounts`, `/accounts/{id}`, `/role`, `/status`, `/accounts-status-logs`.
- Thuốc, nhóm thuốc, lô và cảnh báo: `/medicines`, `/categories`, `/inventory/batches`, `/inventory/alerts`.
- Nhà cung cấp và phiếu: `/suppliers`, `/import-vouchers`, `/export-vouchers`.
- Báo cáo: `/reports/activity`, `/reports/top-selling`, `/reports/revenue`.

Các đường dẫn trên có tiền tố `/api/v1`. Phiếu xuất và hóa đơn hiển thị tổng tiền do backend trả về. Sau khi ghi thành công, giao diện tải lại dữ liệu từ máy chủ. Lỗi kết nối, lỗi kiểm tra dữ liệu và lỗi nghiệp vụ hiển thị trên trang/hộp thoại; nút gửi bị khóa trong lúc xử lý.

Phiên đăng nhập gồm token do backend cấp và thông tin người dùng được lưu trong `sessionStorage` của tab. Không lưu mật khẩu, thuốc, tồn kho hay phiếu trong trình duyệt. Phiên được kiểm tra lại với `/auth/me` khi tải trang; đăng xuất xóa phiên. Dữ liệu localStorage từ bản giao diện cũ không còn được ứng dụng đọc.

Backend hiện có sử dụng token mô phỏng và một số endpoint chưa gắn kiểm tra quyền. Việc nối FE không chuyển cơ chế đó thành JWT hoặc hệ thống xác thực production. Cần hoàn thiện xác thực và phân quyền phía backend trước khi triển khai thực tế.

## Kiểm thử

```powershell
npm run build
npm test
npm run test:integration
```

- `npm test`: kiểm tra HTTP client, payload theo contract, token, lỗi kết nối, phiên hết hiệu lực và hóa đơn từ server.
- `npm run test:integration`: tự mở backend ở cổng 8001 và Vite ở 3001, kiểm tra các luồng bằng Chrome headless. Cần Chrome đã cài và môi trường `BE/.venv` có đủ dependencies. Dùng SQLite trong thư mục tạm, không ghi vào database đang làm việc; tự dọn các tiến trình và dữ liệu tạm.
- `node smoke.mjs`: kiểm tra giao diện đọc dữ liệu trên hệ thống đang chạy ở cổng 3000.

## Mã nguồn chính

- `src/services/apiClient.ts`: URL, Bearer token, timeout và lỗi HTTP.
- `src/services/pharmacyService.ts`: hợp đồng API theo nghiệp vụ.
- `src/components/ui/api-status.tsx`: trạng thái tải/lỗi và chặn thao tác lặp.
- `src/components`: các màn hình React.
- `../BE/app/packages/package_nguoidung/tai_khoan_controller.py`: bổ sung `/auth/me`.
- `DESIGN.md`: hệ thống thiết kế giao diện.
