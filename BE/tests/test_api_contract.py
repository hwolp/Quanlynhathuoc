"""
Bộ Kiểm thử Tự động (API Contract Test Suite) cho Backend FastAPI
Kiểm tra toàn bộ 11 Use Cases (UC001 -> UC011) theo đúng Đặc tả SRS V4.0.0
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app


def run_all_tests():
    with TestClient(app) as client:
        print("=== 1. KIỂM THỬ HEALTH CHECK ===")
        r = client.get("/health")
        assert r.status_code == 200, r.text
        print("[PASS] GET /health ->", r.json()["status"])

        print("\n=== 2. KIỂM THỬ UC001: ĐĂNG NHẬP & BẢO MẬT RBAC (Bảng 2-1, 2-2 & Mục 3.2) ===")
        # Chưa đăng nhập -> 401
        r_unauth = client.get("/api/v1/medicines")
        assert r_unauth.status_code == 401, r_unauth.text
        print("[PASS] GET /api/v1/medicines (Unauthenticated) -> 401 Unauthorized")

        # Thành công
        r_login = client.post(
            "/api/v1/auth/login",
            json={"tenDangNhap": "admin_clin_01", "matKhau": "admin123"},
        )
        assert r_login.status_code == 200, r_login.text
        assert r_login.json()["user"]["maVaiTro"] == "ADMIN"
        client.headers.update({"Authorization": f"Bearer {r_login.json()['accessToken']}"})
        print("[PASS] POST /api/v1/auth/login (Admin) ->", r_login.json()["user"]["hoTen"])

        # Tài khoản bị khóa (DS002)
        r_locked = client.post(
            "/api/v1/auth/login",
            json={"tenDangNhap": "duocsi_lananh", "matKhau": "duocsi123"},
        )
        assert r_locked.status_code == 403, r_locked.text
        print("[PASS] POST /api/v1/auth/login (Locked Account) -> 403 Forbidden")

        print("\n=== 3. KIỂM THỬ UC002, UC003, UC004: QUẢN LÝ TÀI KHOẢN & TRẠNG THÁI ===")
        r_accs = client.get("/api/v1/accounts")
        assert r_accs.status_code == 200
        print(f"[PASS] GET /api/v1/accounts -> {len(r_accs.json())} tài khoản")

        # Tạo tài khoản mới (UC002)
        r_new_acc = client.post(
            "/api/v1/accounts",
            json={
                "tenDangNhap": "duocsi_test09",
                "matKhau": "Test@123",
                "xacNhanMatKhau": "Test@123",
                "hoTen": "Nguyễn Văn Test",
                "maVaiTro": "DUOCSI",
            },
        )
        assert r_new_acc.status_code == 201, r_new_acc.text
        new_tk_id = r_new_acc.json()["maTaiKhoan"]
        print(f"[PASS] POST /api/v1/accounts (UC002) -> Tạo mã {new_tk_id}")

        # Phân quyền (UC003)
        r_role = client.patch(
            f"/api/v1/accounts/{new_tk_id}/role", json={"maVaiTro": "QUANLY"}
        )
        assert r_role.status_code == 200
        assert r_role.json()["maVaiTro"] == "QUANLY"
        print(f"[PASS] PATCH /api/v1/accounts/{new_tk_id}/role (UC003) -> QUANLY")

        # Khóa tài khoản (UC004)
        r_status = client.patch(
            f"/api/v1/accounts/{new_tk_id}/status",
            json={
                "trangThaiMoi": "Khóa",
                "lyDo": "Kiểm thử khóa tài khoản",
                "nguoiThucHien": "admin_clin_01",
            },
        )
        assert r_status.status_code == 200
        assert r_status.json()["trangThai"] == "Khóa"
        print(f"[PASS] PATCH /api/v1/accounts/{new_tk_id}/status (UC004) -> Khóa")

        # Xóa tài khoản vừa tạo (UC003)
        r_del_acc = client.delete(f"/api/v1/accounts/{new_tk_id}")
        assert r_del_acc.status_code == 200
        print(f"[PASS] DELETE /api/v1/accounts/{new_tk_id} (UC003) -> Đã xóa")

        print("\n=== 4. KIỂM THỬ UC005 & UC008: DANH MỤC THUỐC & TỒN KHO ===")
        r_meds = client.get("/api/v1/medicines")
        assert r_meds.status_code == 200
        print(f"[PASS] GET /api/v1/medicines -> {len(r_meds.json())} thuốc")

        r_alerts = client.get("/api/v1/inventory/alerts")
        assert r_alerts.status_code == 200
        print(
            f"[PASS] GET /api/v1/inventory/alerts -> Sắp hết: {r_alerts.json()['tongThuocSapHet']}, Sắp hết hạn: {r_alerts.json()['tongThuocSapHetHan']}"
        )

        print("\n=== 5. KIỂM THỬ UC007: PHIẾU NHẬP KHO & CẬP NHẬT TỒN KHO ===")
        med_before = client.get("/api/v1/medicines/PARA500").json()["tongTonKho"]
        r_pn = client.post(
            "/api/v1/import-vouchers",
            json={
                "ngayNhap": "2026-11-09 09:00",
                "maNCC": "NCC001",
                "nguoiLap": "QL001",
                "chiTiet": [
                    {
                        "maThuoc": "PARA500",
                        "maLo": "LOT26_TEST",
                        "soLuongNhap": 30,
                        "donGiaNhap": 30000,
                        "hanSuDung": "2028-01-01",
                    }
                ],
            },
        )
        assert r_pn.status_code == 201, r_pn.text
        ma_pn = r_pn.json()["maPN"]
        med_after_import = client.get("/api/v1/medicines/PARA500").json()["tongTonKho"]
        assert med_after_import == med_before + 30
        print(
            f"[PASS] POST /api/v1/import-vouchers ({ma_pn}) -> Tồn kho PARA500 tăng từ {med_before} lên {med_after_import}"
        )

        # Hủy phiếu nhập -> hoàn tồn kho
        r_del_pn = client.delete(f"/api/v1/import-vouchers/{ma_pn}")
        assert r_del_pn.status_code == 200
        med_after_del_pn = client.get("/api/v1/medicines/PARA500").json()["tongTonKho"]
        assert med_after_del_pn == med_before
        print(
            f"[PASS] DELETE /api/v1/import-vouchers/{ma_pn} -> Tồn kho PARA500 hoàn về {med_after_del_pn}"
        )

        print("\n=== 6. KIỂM THỬ UC006: PHIẾU XUẤT KHO & TRỪ TỒN KHO ===")
        r_px = client.post(
            "/api/v1/export-vouchers",
            json={
                "nguoiBan": "DS001",
                "ngayBan": "2026-11-09 09:30",
                "loaiXuat": "Bán lẻ trực tiếp",
                "tenKhachHang": "Khách Test API",
                "chietKhau": 5000,
                "phuongThucThanhToan": "Tiền mặt",
                "chiTiet": [
                    {
                        "maThuoc": "PARA500",
                        "soLuongXuat": 5,
                        "donGiaBan": 45000,
                    }
                ],
            },
        )
        assert r_px.status_code == 201, r_px.text
        ma_px = r_px.json()["maPX"]
        assert r_px.json()["tongTien"] == 5 * 45000 - 5000
        med_after_export = client.get("/api/v1/medicines/PARA500").json()["tongTonKho"]
        assert med_after_export == med_before - 5
        print(
            f"[PASS] POST /api/v1/export-vouchers ({ma_px}) -> Tồn kho PARA500 giảm từ {med_before} xuống {med_after_export}"
        )

        # Hủy phiếu xuất -> hoàn trả tồn kho
        r_del_px = client.delete(f"/api/v1/export-vouchers/{ma_px}")
        assert r_del_px.status_code == 200
        med_restored = client.get("/api/v1/medicines/PARA500").json()["tongTonKho"]
        assert med_restored == med_before
        print(
            f"[PASS] DELETE /api/v1/export-vouchers/{ma_px} -> Tồn kho PARA500 hoàn lại {med_restored}"
        )

        print("\n=== 7. KIỂM THỬ UC009, UC010, UC011: BÁO CÁO & THỐNG KÊ ===")
        r_act = client.get("/api/v1/reports/activity?type=ALL")
        assert r_act.status_code == 200
        print(
            f"[PASS] GET /api/v1/reports/activity (UC009) -> {len(r_act.json()['rows'])} dòng giao dịch"
        )

        r_top = client.get("/api/v1/reports/top-selling?topN=5")
        assert r_top.status_code == 200
        print(
            f"[PASS] GET /api/v1/reports/top-selling (UC010) -> Top {len(r_top.json())} thuốc bán chạy"
        )

        r_rev = client.get("/api/v1/reports/revenue")
        assert r_rev.status_code == 200
        print(
            f"[PASS] GET /api/v1/reports/revenue (UC011) -> Tổng doanh thu: {r_rev.json()['tongDoanhThu']:,} VND"
        )

        print("\n=== TẤT CẢ 11 USE CASES (UC001 -> UC011) ĐỀU PASS 100%! ===")


if __name__ == "__main__":
    run_all_tests()
