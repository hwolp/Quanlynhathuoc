"""Module UC005. A missing UI capability is a product failure, never a silent skip."""
import time,re
import pytest
from playwright.sync_api import expect
from support.cases import ROOT,read_json,select_cases,CONFIG
from pages.application import App,Inventory
DATA=read_json(ROOT/'data/inventory.json')
STOCKS={m['id']:m['stock'] for m in DATA['medicines']}
def assert_inventory(inv,record):
    expect(inv.data_rows()).to_have_count(len(STOCKS))
    for code,quantity in STOCKS.items():
        row=inv.row(code);expect(row).to_be_visible()
        # Both real inventory tables put stock in the fifth data column.
        headers=inv.main.locator('thead th').all_text_contents()
        stock_index=next(i for i,h in enumerate(headers) if 'TỒN' in h.upper())
        text=row.locator('td').nth(stock_index).inner_text()
        digits=''.join(re.findall(r'\d',text))
        assert int(digits)==quantity,f'{code}: tồn hiển thị={text}, fixture={quantity}'
    record['observations'].append(f'Bảng tồn khớp fixture {STOCKS}.')
@pytest.mark.parametrize('case',select_cases('Feature 5','Feature 6'),ids=lambda c:f'{c["sheet"]}::{c["id"]}')
def test_inventory(case,qa):
    page,db,record=qa.page,qa.db,qa.record
    app=App(page);inv=Inventory(page);number=int(case['id'][-3:])
    if number==26:
        app.open();expect(page.get_by_role('heading',name='Đăng nhập',exact=True)).to_be_visible()
        assert page.locator('main tbody tr').count()==0
        record['observations'].append('UI yêu cầu đăng nhập tại URL /; không có dữ liệu kho.')
        if CONFIG['policy']['check_server_authorization']:
            response=page.request.get(CONFIG['api_url']+'/medicines')
            record['measurements']['authorization_http_status']=response.status
            record['observations'].append(f'API bổ sung GET /medicines không có token: HTTP {response.status}.')
            assert response.status in (401,403),f'Backend vẫn trả dữ liệu kho cho phiên chưa đăng nhập (HTTP {response.status}).'
        return
    if 19<=number<=23:
        # Workbook explicitly permits thresholds to live in a separate configuration screen.
        app.login('manager');inv.open('manager');dialog,field=inv.edit_threshold('T001')
        value=DATA['threshold_values'][case['id']];before=db.threshold()
        if value=='abc':field.click();field.press('ControlOrMeta+A');field.press_sequentially(value)
        else:field.fill(value)
        actual=field.input_value();record['measurements']['input_value']=actual
        record['observations'].append(f'Ngưỡng là cấu hình thuốc: kiểm tra tại modal Sửa thuốc của Quản lý (được phép trong Note nguồn). Yêu cầu nhập={value}; value thực={actual}.')
        if number==19:
            assert actual=='1';dialog.get_by_role('button',name='Lưu thay đổi',exact=True).click();expect(dialog).to_have_count(0);app.wait_loaded();assert db.threshold()==1;record['observations'].append('Database lưu ngưỡng=1.');return
        if actual!=value:
            # Integer coercion (e.g. 1.5 -> 1) is acceptance, not rejection.
            valid=bool(re.fullmatch(r'[1-9]\d*',actual))
            if actual==str(before):
                assert db.threshold()==before
                record['observations'].append(f'Control không nhận {value}; giữ nguyên {before}, database không thay đổi. Đây là chặn nhập, được Expected Results cho phép.')
                return
            if value=='abc':
                assert not actual or actual==str(before),'Ký tự chữ bị chuyển thành giá trị cấu hình mới.'
                record['observations'].append('Native number control chặn chữ; không lưu ngưỡng abc.');return
            if valid:
                dialog.get_by_role('button',name='Lưu thay đổi',exact=True).click()
                expect(dialog).to_have_count(0);app.wait_loaded()
                record['observations'].append(f'Sau click Lưu, ngưỡng database đổi từ {before} thành {db.threshold()}. Không có thông báo dữ liệu thập phân không hợp lệ.')
                pytest.fail(f'UI âm thầm đổi {value} thành số hợp lệ {actual}, lưu vào DB={db.threshold()}; không có cảnh báo/chặn theo testcase.')
        dialog.get_by_role('button',name='Lưu thay đổi',exact=True).click()
        assert db.threshold()==before,f'Giá trị {value} đã làm thay đổi cấu hình từ {before} thành {db.threshold()}.'
        expect(dialog).to_be_visible()
        validity=field.evaluate('(el)=>({valid:el.validity.valid,message:el.validationMessage})')
        record['observations'].append(f'Giá trị bị chặn; validity={validity}; ngưỡng DB giữ {before}.')
        assert not validity['valid'] or dialog.locator('.text-rose-700,.api-error').count()>0,'Không thấy validation chặn đầu vào.'
        return
    role='manager' if number==2 else 'pharmacist'
    app.login(role);inv.open(role)
    if number in (1,2):assert_inventory(inv,record);return
    if number==25:
        assert not db.stocks()
        assert inv.data_rows().count()==0
        empty=inv.main.get_by_text(re.compile('không có thuốc|chưa có thuốc|không có dữ liệu|không tìm thấy',re.I))
        record['observations'].append(f'Kho rỗng: số dòng={inv.data_rows().count()}; thông báo rỗng={empty.all_text_contents()}.')
        assert empty.count()>0,'Bảng không có dòng nhưng không hiển thị thông báo không có thuốc như Expected Results.'
        return
    if number in (3,27):
        if number==27:
            record['measurements']['stocks_before']=db.stocks()
            record['measurements']['transactions_before']=db.transaction_count()
        inv.search(DATA['keywords']['code'])
        expect(inv.row('T001')).to_be_visible()
        target='T001'
        if number==27:
            inv.search('');inv.group('Kháng sinh');target='T003'
        inv.detail(target)
        detail=page.get_by_role('dialog')
        medicine=next(m for m in DATA['medicines'] if m['id']==target)
        group=next(g for g in DATA['groups'] if g['id']==medicine['group'])
        expect(detail).to_contain_text(target)
        expect(detail).to_contain_text(medicine['name'])
        expect(detail).to_contain_text(group['name'])
        expect(detail.get_by_text(f'{medicine["stock"]} / {medicine["threshold"]}',exact=True)).to_be_visible()
        record['observations'].append(f'Chi tiết {target} khớp mã, tên, nhóm và số lượng fixture.')
        if number==27:
            page.keyboard.press('Escape');inv.require_group().select_option(label='Tất cả nhóm thuốc')
            page.reload();inv.open('pharmacist');assert_inventory(inv,record)
            assert db.stocks()==STOCKS
            assert db.transaction_count()==record['measurements']['transactions_before']
            record['observations'].append('Tìm T001, lọc Kháng sinh, xem T003 và refresh không đổi tồn hoặc tạo giao dịch.')
        return
    if number in (4,5,6,7,8,9,10,24,28):
        keyword={4:DATA['keywords']['code'],5:DATA['keywords']['name'],6:DATA['keywords']['not_found'],7:'',24:DATA['keywords']['code'],28:DATA['keywords']['code']}.get(number,DATA['keywords']['boundary_character']*{8:254,9:255,10:256}.get(number,1))
        t0=time.perf_counter();field=inv.search(keyword)
        if number==10:
            actual=field.input_value();record['measurements']['keyword_length']=len(actual)
            assert len(actual)<=255 or inv.main.get_by_text(re.compile('255|quá dài')).count()>0,'Giao diện nhận đủ 256 ký tự, không có cảnh báo giới hạn.'
        elif number in (6,8,9):
            assert field.input_value()==keyword;expect(inv.data_rows()).to_have_count(0);expect(inv.main.get_by_text(re.compile('không tìm thấy|không có kết quả',re.I))).to_be_visible()
        elif number==7:assert_inventory(inv,record)
        else:
            expect(inv.row('T001')).to_be_visible();expect(inv.data_rows()).to_have_count(1)
            if number==28:
                elapsed=time.perf_counter()-t0;record['measurements']['lookup_seconds']=elapsed
                if not CONFIG.get('headless',False) and CONFIG.get('slow_mo_ms',0)>0:
                    record['observations'].append(f'Tra cứu đúng T001; thời gian quan sát {elapsed:.3f}s có slow motion trình diễn, không dùng kết luận ngưỡng hiệu năng 2 giây.')
                    pytest.skip('Blocked: lượt headed có slow motion; cần phép đo không có độ trễ trình diễn để đánh giá SLA 2 giây.')
                assert elapsed<=CONFIG['performance_limit_seconds'],f'Tra cứu mất {elapsed:.3f}s > {CONFIG["performance_limit_seconds"]}s.'
        return
    if number in (11,12,13,17,18):
        if number in (17,18):inv.search(DATA['keywords']['name'])
        inv.group('Thuốc giảm đau' if number in (11,17) else 'Kháng sinh')
        if number==13:inv.require_group().select_option(label='Tất cả nhóm thuốc');assert_inventory(inv,record)
        elif number==18:inv.status('Hết');expect(inv.data_rows()).to_have_count(0)
        elif number==17:expect(inv.row('T001')).to_be_visible();expect(inv.data_rows()).to_have_count(1)
        else:
            expected=['T001','T002'] if number==11 else ['T003','T004'];expect(inv.data_rows()).to_have_count(2)
            for code in expected:expect(inv.row(code)).to_be_visible()
        return
    if number in (14,15,16):
        # First check that the requested control exists, a definite UI requirement.
        inv.status({14:'Còn',15:'Sắp hết',16:'Hết'}[number])
        if number in (14,15) and not CONFIG['policy']['stock_status_rule_confirmed']:
            pytest.skip('Blocked: workbook yêu cầu xác nhận quy tắc Còn/Sắp hết trước khi chốt đầy đủ tập kết quả.')
        if number==16:expect(inv.row('T003')).to_be_visible();expect(inv.data_rows()).to_have_count(1)
        return
    pytest.fail('Testcase chưa có implementation; không tự đánh dấu Pass.')
