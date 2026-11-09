"""A guarded fixture writer. It can only reset this run's dedicated QA SQLite file."""
import sqlite3,hashlib
from datetime import datetime
from pathlib import Path
from .cases import ROOT,CONFIG,read_json
class QaDatabase:
    def __init__(self,path):
        self.path=Path(path).resolve()
        if not self.path.is_relative_to((ROOT/'runs').resolve()) or self.path.name!='qa.db':
            raise RuntimeError('Refusing to modify a database outside Testing/runs/.../qa.db')
    def connect(self):
        db=sqlite3.connect(self.path,timeout=20);db.row_factory=sqlite3.Row;db.execute('PRAGMA foreign_keys=ON');return db
    def reset(self,empty_inventory=False):
        inventory=read_json(ROOT/'data/inventory.json')
        with self.connect() as db:
            for table in ['chitietphieuxuat','chitietphieunhap','phieuxuat','phieunhap','lothuoc','thuoc','nhomthuoc','lichsu_trangthai_taikhoan','taikhoan']:
                db.execute(f'DELETE FROM {table}')
            for name,account in CONFIG['credentials'].items():
                db.execute('INSERT INTO taikhoan (MaTaiKhoan,TenDangNhap,MatKhau,HoTen,MaVaiTro,TrangThai,NgayTao) VALUES (?,?,?,?,?,?,?)',(account['id'],account['username'],hashlib.sha256(account['password'].encode()).hexdigest(),f'QA {name}',account['role'],'Hoạt động',datetime.now().isoformat(' ')))
            for group in inventory['groups']:
                db.execute('INSERT INTO nhomthuoc(MaNhom,TenNhom) VALUES (?,?)',(group['id'],group['name']))
            if not empty_inventory:
                for m in inventory['medicines']:
                    db.execute('INSERT INTO thuoc(MaThuoc,TenThuoc,MaNhom,DonViTinh,GiaBan,TongTonKho,TonToiThieu,HanSuDung,QuyCach,HoatChat) VALUES (?,?,?,?,?,?,?,?,?,?)',(m['id'],m['name'],m['group'],m['unit'],m['price'],m['stock'],m['threshold'],m['expiry'],'Hộp 10 vỉ','QA'))
                    db.execute('INSERT INTO lothuoc(MaLo,MaThuoc,HanSuDung,SoLuongTonLo) VALUES (?,?,?,?)',(f'LOT-{m["id"]}',m['id'],m['expiry'],m['stock']))
    def rows(self,sql,params=()):
        with self.connect() as db:return [dict(row) for row in db.execute(sql,params).fetchall()]
    def account(self,username):return self.rows('SELECT MaTaiKhoan,TenDangNhap,HoTen,MaVaiTro FROM taikhoan WHERE TenDangNhap=?',(username,))
    def stocks(self):return {r['MaThuoc']:r['TongTonKho'] for r in self.rows('SELECT MaThuoc,TongTonKho FROM thuoc ORDER BY MaThuoc')}
    def threshold(self,code='T001'):return self.rows('SELECT TonToiThieu FROM thuoc WHERE MaThuoc=?',(code,))[0]['TonToiThieu']
    def transaction_count(self):return sum(self.rows(f'SELECT COUNT(*) AS n FROM {table}')[0]['n'] for table in ['phieunhap','phieuxuat'])
