# Testing — Python Chromium automation

Bộ kiểm thử website PharmaCare dùng **Playwright Python + Chromium + pytest**, lấy testcase thật từ `Test_Report_2.xlsx`. Không dùng JavaScript để sửa value hoặc bypass validation. Python thực hiện thao tác giao diện; SQLite QA là nguồn đối chiếu hậu điều kiện. Các ca phân quyền có bước API bổ sung từ chính phiên Chromium, ghi rõ trong báo cáo.

## Cài đặt

Mở PowerShell tại thư mục `Testing`:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m playwright install chromium
```

Backend cần môi trường `../BE/.venv` có dependencies từ `../BE/requirements.txt`; frontend cần `../FE/node_modules` đã được cài bằng `npm install`.

## Chạy Round 1 trực quan

Có thể chạy nhanh bằng PowerShell: `./Chay_Round_1_Truc_Quan.ps1`.

```powershell
.venv\Scripts\python.exe run_round.py --round 1
```

Mặc định `headless=false`: Chromium mở cửa sổ thật và tự thao tác. `slow_mo_ms=200` làm chậm thao tác để theo dõi; `case_hold_ms=1200` giữ màn hình cuối mỗi ca trước khi đóng phiên. Có thể chỉnh các giá trị này trong `config.json`. Khoảng giữ cuối ca nằm ngoài phép đo/assertion.

Ép mở cửa sổ dù config đang đặt headless:

```powershell
.venv\Scripts\python.exe run_round.py --round 1 --headed
```

Chạy riêng module hoặc testcase:

```powershell
.venv\Scripts\python.exe run_round.py --round 1 --module registration
.venv\Scripts\python.exe run_round.py --round 1 --module inventory
.venv\Scripts\python.exe run_round.py --round 1 --case F2_TC012
```

Exit code **1** nghĩa là có testcase Failed, không đồng nghĩa script không chạy được. Exit code khác 0/1 cần xem `manifest.json` và `pytest.log` để phân biệt lỗi hạ tầng. Không tự tăng round khi chạy lại. Round 2/3 chỉ chạy khi được yêu cầu.

## Những giá trị có thể sửa

| File | Nội dung |
|---|---|
| `config.json` | đường dẫn Excel, tên tester, cổng 3010/8010, URL QA, headless, viewport, timeout, tài khoản |
| `data/registration.json` | username, password, xác nhận, họ tên, vai trò, dữ liệu biên theo từng mã testcase |
| `data/inventory.json` | 4 thuốc QA, nhóm, tồn 100/5/0/20, ngưỡng 10, giá, hạn dùng, từ khóa, ngưỡng kiểm thử |
| `pages/application.py` | locator thực tế và thao tác dùng chung; sửa tại đây khi nhãn/form thay đổi |
| `tests/test_registration.py` | assertions cho UC002 / Feature 2 |
| `tests/test_inventory.py` | assertions cho UC005 / Feature 5 và dòng trùng Feature 6 |

Khi đổi cổng, cập nhật đồng thời `backend_port`/`frontend_port` và `base_url`/`api_url`. Tài khoản trong config được tạo vào database QA riêng; không cần đổi tài khoản trong database đang sử dụng.

## Cô lập và phạm vi

Mỗi lần chạy tự tạo `runs/Round_N_timestamp/qa.db`, mở backend và Vite riêng rồi dừng các tiến trình **do runner tạo**. Dữ liệu QA được reset trước/sau từng ca. Guard chặn fixture writer nếu database nằm ngoài `Testing/runs/.../qa.db`. Không chạy test ghi dữ liệu vào cổng 3000/8000 đang sử dụng. Nếu cổng QA đã bận, runner báo lỗi và không dừng tiến trình đó.

Workbook nguồn giữ nguyên. `Feature 1` chứa placeholder được loại khỏi phạm vi; có 50 mã testcase thật: Feature 2 = 22, Feature 5 = 28. Feature 6 sao chép F5_TC001 nên được chạy thêm như một dòng độc lập: tổng 51 dòng. Không thêm số lần chạy của dòng trùng vào số testcase duy nhất.

Màn tạo tài khoản là modal trên URL `/`, không có route riêng. Các ca truy cập trực tiếp dùng URL thật này và kiểm tra role/menu/form, kèm POST API nếu `check_server_authorization=true`. Báo cáo phân biệt kết quả UI và API; không tạo JWT hoặc giả mạo role.

Nếu màn Kho thuốc không có ô tìm/nhóm/trạng thái, testcase tương ứng Failed vì chức năng UI còn thiếu; không lách sang POS hoặc gọi API tìm kiếm thay cho bước UI. Đối với ngưỡng, Note trong Excel cho phép dùng màn cấu hình thuốc; các ca ngưỡng dùng modal Sửa thuốc của Quản lý. Những quy tắc phân loại Còn/Sắp hết chưa được xác nhận không được suy đoán; nếu chức năng đã có nhưng thiếu quy tắc, báo Blocked.

## Kết quả và bằng chứng

Mỗi lần chạy giữ nguyên một thư mục mới trong `reports/`. `reports/LATEST.txt` chỉ đến lần chạy gần nhất.

- `report.html`: báo cáo đọc trong trình duyệt, lọc Passed/Failed, mở chi tiết và ảnh.
- `Round_1_Report.md`: phân tích từng ca và nhóm lỗi.
- `results.json`, `summary.json`, `results.csv`: dữ liệu máy đọc và import Excel.
- `junit.xml`, `pytest.log`: tích hợp CI và log thực thi.
- `manifest.json`: thời gian, hash nguồn Excel và hash mã ứng dụng trước/sau.
- `evidence/<sheet>__<case>/`: ảnh, DOM HTML, console/network, nhận xét và `trace.zip` cho từng testcase.

Mở trace bằng:

```powershell
.venv\Scripts\python.exe -m playwright show-trace reports\<run>\evidence\<case>\trace.zip
```

CSV/HTML/JSON luôn được Python tự xuất. Bản XLSX Round 1 được tạo thêm từ dữ liệu đã thực thi bằng script Artifact Tool trong `reporting/export_workbook.mjs` ở môi trường Codex hiện tại; workbook nguồn không bị ghi đè.

Bộ này kiểm thử chức năng và phép đo phản hồi UI nhỏ; không phải kiểm thử tải hay đánh giá bảo mật toàn diện.

Để chạy nhanh trên CI, đặt `headless=true` (slow motion tự tắt). Kết quả thời gian phản hồi của lượt có slow motion không dùng thay cho phép đo hiệu năng không có độ trễ trình diễn.
