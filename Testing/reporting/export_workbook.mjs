// Optional XLSX export from Python's observed results. Uses the managed Artifact Tool runtime.
import fs from 'node:fs/promises';
import path from 'node:path';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
const folder=path.resolve(process.argv[2]);
const results=JSON.parse(await fs.readFile(path.join(folder,'results.json'),'utf8'));
const summary=JSON.parse(await fs.readFile(path.join(folder,'summary.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
const wb=Workbook.create();
const overview=wb.worksheets.add('Tổng quan');const details=wb.worksheets.add('Kết quả');
for(const sheet of [overview,details]){sheet.showGridLines=false;sheet.getRange('A1:N80').format.font={name:'Arial',size:10};sheet.getRange('A1:N80').format.verticalAlignment='center';}
function title(sheet,text,last='H'){sheet.mergeCells(`A2:${last}2`);sheet.getRange('A2').values=[[text]];sheet.getRange(`A2:${last}2`).format.font={name:'Arial',size:15,bold:true,color:'#174B3A'};sheet.getRange('A2').format.rowHeight=30;}
function header(sheet,range){sheet.getRange(range).format={fill:'#1E5D48',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:28,wrapText:true};}
title(details,`Chi tiết thực thi Round ${summary.round}`,'N');
details.mergeCells('A3:N3');details.getRange('A3').values=[['Đối chiếu đúng mã và dòng trong Test_Report_2.xlsx. Round 2 và 3 chưa thực thi. Xem report.html để mở các bước và toàn bộ bằng chứng.']];details.getRange('A3:N3').format.font={name:'Arial',size:10,color:'#627568'};
const headers=['Sheet nguồn','Mã testcase','Mô tả','Round 1','Kỳ vọng từ Excel','Quan sát và lý do','Mã lỗi','Bằng chứng','Thời điểm','Giây','Dòng Excel','Round 2','Round 3','Mã duy nhất'];
details.getRange('A5:N5').values=[headers];header(details,'A5:N5');
const seen=new Set();
function reason(r){const errors=(r.failure||'').split('\n').filter(s=>/^E\s/.test(s)).map(s=>s.replace(/^E\s+/,''));return [...r.observations,...errors.filter(s=>/AssertionError:|Failed:/.test(s))].join('\n') || (r.status==='Passed'?'Thao tác và các assertion đã đạt.':(r.failure||''));}
const rows=results.map(r=>{const unique=seen.has(r.id)?0:1;seen.add(r.id);return[r.sheet,r.id,r.description,r.status,r.expected,reason(r),r.defect_id||'',r.screenshot||'',r.started_at.slice(0,19).replace('T',' '),r.duration_seconds||0,r.row,'Pending','Pending',unique];});
const last=rows.length+5;details.getRange(`A6:N${last}`).values=rows;
const widths={A:15,B:16,C:39,D:12,E:65,F:88,G:18,H:55,I:23,J:10,K:12,L:12,M:12,N:14};for(const [column,width] of Object.entries(widths))details.getRange(`${column}1:${column}${last}`).format.columnWidth=width;
details.getRange(`A6:N${last}`).format.wrapText=true;details.getRange(`A6:N${last}`).format.verticalAlignment='top';details.getRange(`A6:N${last}`).format.rowHeight=145;
details.getRange(`J6:J${last}`).setNumberFormat('0.000');details.freezePanes.freezeRows(5);details.freezePanes.freezeColumns(2);
for(let index=0;index<rows.length;index++){const row=index+6;details.getRange(`A${row}:N${row}`).format.fill=index%2?'#F5F8F6':'#FFFFFF';details.getRange(`D${row}`).format.fill=rows[index][3]==='Passed'?'#E0F1E7':rows[index][3]==='Failed'?'#FCE8E4':'#FFF0CC';details.getRange(`D${row}`).format.font={name:'Arial',size:10,bold:true,color:rows[index][3]==='Passed'?'#216A48':'#A33C30'};}

title(overview,`Kết quả kiểm thử Round ${summary.round}`);
overview.mergeCells('A4:H4');overview.getRange('A4').values=[['Python + Playwright + Chromium | UC002 Đăng ký và UC005 Tra cứu tồn kho']];
overview.getRange('A6:H6').values=[['Phạm vi','Số ca','Passed','Failed','Blocked','Error','Pending','Ghi chú']];header(overview,'A6:H6');
overview.getRange('A7').values=[['Mã testcase duy nhất']];overview.getRange('A8').values=[['Dòng trùng Feature 6']];overview.getRange('A9').values=[['Tất cả dòng đã chạy']];
const statuses=['Passed','Failed','Blocked','Error','Pending'];
const dataSheet="'Kết quả'";const statusRange=`${dataSheet}!$D$6:$D$${last}`;const uniqueRange=`${dataSheet}!$N$6:$N$${last}`;const idRange=`${dataSheet}!$B$6:$B$${last}`;const moduleRange=`${dataSheet}!$A$6:$A$${last}`;
overview.getRange('B7').formulas=[[`=SUM(${uniqueRange})`]];overview.getRange('B8').formulas=[['=B9-B7']];overview.getRange('B9').formulas=[[`=COUNTA(${idRange})`]];
for(let i=0;i<5;i++){const col=String.fromCharCode(67+i);overview.getRange(`${col}7`).formulas=[[`=SUMIFS(${uniqueRange},${statusRange},"${statuses[i]}")`]];overview.getRange(`${col}9`).formulas=[[`=COUNTIFS(${statusRange},"${statuses[i]}")`]];overview.getRange(`${col}8`).formulas=[[`=${col}9-${col}7`]];}
overview.getRange('H7:H9').values=[['Feature 2 và Feature 5'],['F5_TC001 được chạy độc lập lần nữa'],['Không cộng Feature 1 vì chỉ là mẫu']];
overview.getRange('A12:H12').values=[['Module','Số dòng','Passed','Failed','Blocked','Error','Pending','Phạm vi']];header(overview,'A12:H12');
for(const [index,module] of ['Feature 2','Feature 5','Feature 6'].entries()){const row=index+13;overview.getRange(`A${row}`).values=[[module]];overview.getRange(`B${row}`).formulas=[[`=COUNTIFS(${moduleRange},"${module}")`]];for(let i=0;i<5;i++)overview.getRange(`${String.fromCharCode(67+i)}${row}`).formulas=[[`=COUNTIFS(${moduleRange},"${module}",${statusRange},"${statuses[i]}")`]];overview.getRange(`H${row}`).values=[[module==='Feature 2'?'UC002 – Đăng ký':module==='Feature 5'?'UC005 – Tra cứu tồn kho':'Bản sao F5_TC001']];}
const notes=[`Nguồn: Test_Report_2.xlsx; bản gốc giữ nguyên (SHA-256: ${manifest.source_sha256.slice(0,16)}…).`,`Round 2 và 3 chưa chạy. Quy tắc Còn/Sắp hết chưa được tự suy đoán.`,`Database QA riêng; mã ứng dụng trước/sau ${manifest.application_source_unchanged?'không thay đổi':'có thay đổi — cần xem manifest'}.`,`Bước UI là chính; các ca phân quyền có yêu cầu API bổ sung từ cùng phiên.`,`Lần chuẩn bị trước bị gián đoạn khi in log Unicode; đây là lần Round 1 hoàn tất.`,`Báo cáo không thay thế kiểm thử tải. Ca 2 giây không đo được nếu thiếu bước tìm kiếm.`];
for(let i=0;i<notes.length;i++){const row=18+i;overview.mergeCells(`A${row}:H${row}`);overview.getRange(`A${row}`).values=[[notes[i]]];overview.getRange(`A${row}:H${row}`).format.wrapText=true;overview.getRange(`A${row}`).format.rowHeight=28;}
overview.mergeCells('A25:H25');overview.getRange('A25').values=[['Các nhóm lỗi được xác nhận']];overview.getRange('A25').format.font={name:'Arial',size:12,bold:true,color:'#174B3A'};
let defectRow=27;for(const defect of summary.defects){overview.getRange(`A${defectRow}`).values=[[defect.id]];overview.mergeCells(`B${defectRow}:H${defectRow}`);overview.getRange(`B${defectRow}`).values=[[`${defect.title} (${defect.cases.length} dòng testcase)`]];overview.getRange(`A${defectRow}:H${defectRow}`).format.rowHeight=28;defectRow++;}
const overviewWidths={A:29,B:12,C:12,D:12,E:12,F:12,G:12,H:43};for(const [column,width] of Object.entries(overviewWidths))overview.getRange(`${column}1:${column}${defectRow}`).format.columnWidth=width;
overview.getRange('A7:H9').format.rowHeight=28;overview.getRange('A13:H15').format.rowHeight=28;overview.getRange('B7:G15').setNumberFormat('0');overview.getRange('A9:H9').format.fill='#EAF2ED';overview.getRange('A9:H9').format.font={name:'Arial',size:10,bold:true};overview.freezePanes.freezeRows(6);
wb.recalculate();
console.log((await wb.inspect({kind:'region',sheetId:overview.name,range:'A6:H15',maxChars:2200,tableMaxRows:10,tableMaxCols:8})).ndjson);
await fs.mkdir(path.join(folder,'qa'),{recursive:true});
const preview=await wb.render({sheetName:'Tổng quan',range:'A1:H35',scale:1.3,format:'png'});await fs.writeFile(path.join(folder,'qa/workbook-summary.png'),new Uint8Array(await preview.arrayBuffer()));
const detailPreview=await wb.render({sheetName:'Kết quả',range:'A5:F8',scale:1,format:'png'});await fs.writeFile(path.join(folder,'qa/workbook-details.png'),new Uint8Array(await detailPreview.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(wb)).save(path.join(folder,`Test_Report_Round_${summary.round}.xlsx`));
console.log(`Workbook exported: ${rows.length} rows, ${seen.size} unique testcase IDs.`);
