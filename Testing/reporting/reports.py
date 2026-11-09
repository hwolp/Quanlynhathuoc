"""Generate portable HTML, Markdown and CSV reports from observed pytest results."""
import csv,html,json,re
from collections import Counter,defaultdict
from pathlib import Path

def defect_for(result):
    failure=result.get('failure','')
    rules=[('không có ô tìm kiếm','BUG-INV-01','Màn Kho thuốc Dược sĩ thiếu tìm kiếm mã/tên'),('không có bộ lọc nhóm','BUG-INV-02','Màn Kho thuốc Dược sĩ thiếu bộ lọc nhóm'),('không có bộ lọc trạng thái','BUG-INV-03','Màn Kho thuốc Dược sĩ thiếu bộ lọc trạng thái'),('không có nút/link Chi tiết','BUG-INV-04','Chưa có thao tác xem chi tiết thuốc'),('không hiển thị thông báo không có thuốc','BUG-INV-05','Kho rỗng chưa có thông báo trạng thái'),('UI âm thầm đổi','BUG-INV-06','Ngưỡng thập phân bị ép sang số nguyên'),('không có thông báo tạo thành công','BUG-REG-01','Thiếu thông báo tạo tài khoản thành công'),('Cảnh báo không đúng điều kiện','BUG-REG-02','Xác nhận mật khẩu rỗng báo không khớp thay vì bắt buộc'),('backend cho','BUG-AUTH-01','API tạo tài khoản thiếu kiểm tra xác thực/phân quyền'),('Backend vẫn trả dữ liệu kho','BUG-AUTH-02','API tồn kho trả dữ liệu khi chưa đăng nhập')]
    for needle,code,title in rules:
        if needle in failure:return code,title
    return ('BUG-OTHER','Cần phân tích lỗi chi tiết')

def generate(report_dir,manifest):
    folder=Path(report_dir);results=json.loads((folder/'results.json').read_text(encoding='utf-8'))
    counts=Counter(r['status'] for r in results);modules=defaultdict(Counter);defects={}
    for r in results:
        modules[r['sheet']][r['status']]+=1
        if r['status']=='Failed':
            code,title=defect_for(r);r['defect_id']=code
            defect=defects.setdefault(code,{'id':code,'title':title,'cases':[],'severity':'High' if code.startswith('BUG-AUTH') else 'Medium'})
            defect['cases'].append(f'{r["sheet"]}!A{r["row"]} ({r["id"]})')
    summary={'round':manifest['round'],'counts':dict(counts),'total_rows':len(results),'unique_ids':len({r['id'] for r in results}),'modules':{k:dict(v) for k,v in modules.items()},'defects':list(defects.values()),'source_workbook':manifest['source_workbook'],'source_sha256':manifest['source_sha256'],'source_unchanged':manifest.get('source_unchanged'),'application_source_unchanged':manifest.get('application_source_unchanged'),'method':'Python Playwright + Chromium; UI assertions + SQLite oracle; supplemental browser API checks for authorization.'}
    (folder/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    (folder/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    with (folder/'results.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.writer(stream);writer.writerow(['Sheet','Excel row','Test Case ID','Description','Round','Result','Actual observations','Failure','Defect','Screenshot','Trace','Start','Duration(s)'])
        for r in results:writer.writerow([r['sheet'],r['row'],r['id'],r['description'],r['round'],r['status'],'\n'.join(r['observations']),r.get('failure',''),r.get('defect_id',''),r.get('screenshot',''),r.get('trace',''),r['started_at'],r.get('duration_seconds',0)])
    lines=[f'# Báo cáo kiểm thử Round {manifest["round"]}','',f'Đã thực thi {len(results)} dòng testcase ({summary["unique_ids"]} mã duy nhất). '+', '.join(f'{key}: {value}' for key,value in counts.items())+'.','', 'Nguồn: '+manifest['source_workbook'],'','Feature 6 lặp F5_TC001; được chạy độc lập và ghi riêng. Feature 1 là mẫu, không thuộc phạm vi. Round 2/3 chưa chạy.','', 'Dữ liệu QA được reset từng ca trên database riêng; script kiểm thử không sửa ứng dụng. Xem manifest để phát hiện thay đổi mã nguồn trong lúc chạy.','', '## Theo module','', '| Sheet | Passed | Failed | Blocked/Error |','|---|---:|---:|---:|']
    for module,counter in modules.items():lines.append(f'| {module} | {counter["Passed"]} | {counter["Failed"]} | {counter["Blocked"]+counter["Error"]} |')
    lines+=['','## Nhóm lỗi','']
    for d in defects.values():lines+=[f'### {d["id"]} — {d["title"]}',f'Mức độ: {d["severity"]}. Các ca: '+', '.join(d['cases']),'']
    lines+=['## Giới hạn diễn giải','','Các lỗi thiếu control trên màn Kho thuốc được đánh Failed, không chuyển sang POS hoặc gọi API tìm kiếm thay cho bước UI. Ca ngưỡng được phép chạy tại cấu hình thuốc của Quản lý theo Note nguồn. Ca phân quyền có kiểm tra UI và yêu cầu API bổ sung từ cùng phiên; không giả mạo token. Các quy tắc Còn/Sắp hết chưa xác nhận không được tự suy đoán. Phép đo 2 giây chỉ áp dụng khi thực hiện được bước tra cứu.','', '## Chi tiết từng testcase','']
    for r in results:
        lines += [f'### {r["sheet"]} / {r["id"]} — {r["status"]}',r['description'],'','Kỳ vọng: '+r['expected'],'','Thực tế: '+'; '.join(r['observations'])]
        if r.get('failure'):lines+=['','```text',r['failure'],'```']
        lines+=['',f'Ảnh: {r.get("screenshot", "không có")}; trace: {r.get("trace", "không có")}.','']
    (folder/'Round_1_Report.md').write_text('\n'.join(lines),encoding='utf-8')
    e=html.escape
    cards=''.join(f'<div class="card"><strong>{value}</strong><span>{e(status)}</span></div>' for status,value in counts.items())
    rows=[]
    for r in results:
        evidence=f'<a href="{e(r.get("screenshot",""))}">Ảnh</a> · <a href="{e(r.get("trace",""))}">Trace</a>'
        rows.append(f'<tr data-status="{r["status"]}"><td>{e(r["sheet"])}<small>Dòng Excel {r["row"]}</small></td><td><b>{e(r["id"])}</b><small>{e(r["description"])}</small></td><td><span class="badge {r["status"]}">{r["status"]}</span></td><td><details><summary>Xem bước, kỳ vọng và thực tế</summary><h4>Bước theo Excel</h4><pre>{e(r["procedure"])}</pre><h4>Kỳ vọng</h4><pre>{e(r["expected"])}</pre><h4>Quan sát</h4><pre>{e(chr(10).join(r["observations"]))}</pre><pre>{e(r.get("failure",""))}</pre><img loading="lazy" src="{e(r.get("screenshot",""))}" alt="Bằng chứng {e(r["id"])}"/></details></td><td>{evidence}<small>{r.get("duration_seconds",0):.3f}s</small></td></tr>')
    document='''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PharmaCare — Round 1</title><style>body{font:14px/1.6 "Segoe UI",sans-serif;background:#f4f7f6;color:#203d35;margin:0;padding:32px}main{max-width:1500px;margin:auto}h1{margin:0}header p{color:#62786d}.cards{display:flex;gap:15px;margin:24px 0}.card{background:white;border:1px solid #dfe8e2;padding:16px 30px;border-radius:10px;display:grid}.card strong{font-size:30px}.card span{color:#63786b}table{width:100%;border-collapse:collapse;background:white}td,th{padding:14px;text-align:left;vertical-align:top;border-bottom:1px solid #e0e8e3}th{background:#eaf1ed}small{display:block;color:#6e8175}pre{white-space:pre-wrap;max-width:800px;background:#f7faf8;padding:10px;font:12px/1.7 Consolas,monospace}summary{cursor:pointer;color:#19785c}.badge{padding:4px 9px;border-radius:6px}.Passed{background:#e3f3e9;color:#22714e}.Failed{background:#ffe7e2;color:#a83d32}.Blocked,.Error{background:#fff2ce;color:#805c0c}img{max-width:750px;width:100%;border:1px solid #dce7df}a{color:#14745a}select,input{padding:9px;margin:0 10px 16px 0;border:1px solid #cddbd1;border-radius:6px}</style><main><header><h1>Kiểm thử PharmaCare — Round 1</h1><p>Python · Playwright · Chromium · Database QA cô lập</p></header>'''+f'<div class="cards">{cards}</div><p>{len(results)} dòng / {summary["unique_ids"]} mã testcase duy nhất. Feature 6 là bản sao của một ca; Feature 1 là mẫu, không chạy. Round 2/3 chưa thực thi.</p><p>Nguồn Excel giữ nguyên. Fixture chỉ thay đổi database QA. Trạng thái mã ứng dụng trước/sau được ghi trong manifest.</p><select id="status"><option value="">Tất cả kết quả</option><option>Passed</option><option>Failed</option><option>Blocked</option><option>Error</option></select><input id="search" placeholder="Lọc mã testcase / module"><table><thead><tr><th>Module</th><th>Testcase</th><th>Kết quả</th><th>Chi tiết</th><th>Bằng chứng</th></tr></thead><tbody>'+''.join(rows)+'''</tbody></table></main><script>function filter(){document.querySelectorAll('tbody tr').forEach(r=>r.hidden=(status.value&&r.dataset.status!==status.value)||!r.textContent.toLowerCase().includes(search.value.toLowerCase()))}const status=document.getElementById('status'),search=document.getElementById('search');status.onchange=filter;search.oninput=filter;</script></html>'''
    notes=manifest.get('execution_notes',[])
    if not manifest.get('application_source_unchanged',True):notes=['Mã ứng dụng thay đổi trong lúc chạy: kết quả không đại diện cho một phiên bản mã nguồn ổn định.']+notes
    if notes:
        banner='<aside style="background:#fff0cc;padding:16px;border-radius:8px;margin:20px 0"><b>Ghi chú thực thi</b><ul>'+''.join('<li>'+html.escape(note)+'</li>' for note in notes)+'</ul></aside>'
        document=document.replace('</header>','</header>'+banner,1)
        with (folder/'Round_1_Report.md').open('a',encoding='utf-8') as stream:stream.write('\n## Ghi chú thực thi\n\n'+'\n'.join('- '+note for note in notes)+'\n')
    (folder/'report.html').write_text(document,encoding='utf-8')
    return summary
