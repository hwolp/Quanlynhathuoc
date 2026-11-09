"""Combine explicitly documented script-review retests; never overwrite raw run results."""
import argparse,json,os,shutil,sys,xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from .reports import generate
ROOT=Path(__file__).resolve().parents[1]
def load(path):return json.loads(Path(path).read_text(encoding='utf-8'))
def consolidate(base,recheck):
    base,recheck=Path(base).resolve(),Path(recheck).resolve()
    a,b=load(base/'manifest.json'),load(recheck/'manifest.json')
    if a['round']!=b['round'] or a['source_sha256']!=b['source_sha256']:raise ValueError('Source/round mismatch; cannot consolidate.')
    if a['application_hashes_before']!=b['application_hashes_before'] or not a['application_source_unchanged'] or not b['application_source_unchanged']:raise ValueError('Application changed between runs; keep reports separate.')
    folder=ROOT/'reports'/f'Round_{a["round"]}_Headed_Reviewed_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    folder.mkdir()
    original=load(base/'results.json');updates={(r['sheet'],r['id']):r for r in load(recheck/'results.json')}
    results=[]
    for row in original:
        key=(row['sheet'],row['id']);source=recheck if key in updates else base
        result=dict(updates.get(key,row));result['origin_run']=source.name
        for attr in ['screenshot','trace','evidence_dir']:
            if result.get(attr):result[attr]=os.path.relpath(source/result[attr],folder).replace('\\','/')
        if key in updates:result['review_note']='Rechecked after correcting test-script row counting/procedure or separating visual-demo timing from SLA. Raw first attempt retained.'
        results.append(result)
    notes=['Headed run with real Chromium windows; slow_mo_ms=200, end-of-case hold=1200ms.','UI empty-state rows with colspan are not medicine rows. Test script now counts data rows only.','F5_TC027 procedure corrected: clear T001 search, filter antibiotics, then open T003.','F5_TC003 additionally checks full detail fields. F5_TC008 rerun to verify UI state after an unexpected return to POS.','F5_TC028 result is Blocked for a headed slow-motion demonstration; no unsupported SLA conclusion.','No application changes made by this test review; both run application hashes match.']
    manifest={**a,'run_id':folder.name,'finished_at':b['finished_at'],'reviewed':True,'consolidated_from':[str(base),str(recheck)],'review_notes':notes,'pytest_exit_code':0 if not any(r['status'] in ['Failed','Error'] for r in results) else 1}
    for name in ['Test_Report_2.source.xlsx','cases.json','config_snapshot.json','browser.json']:
        if (base/name).exists():shutil.copy2(base/name,folder/name)
    (folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    (folder/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    (folder/'REVIEW_NOTES.md').write_text('# Review of headed Round 1\n\n'+'\n'.join('- '+n for n in notes)+'\n\nRaw runs:\n'+str(base)+'\n'+str(recheck),encoding='utf-8')
    root=ET.Element('testsuites');suite=ET.SubElement(root,'testsuite',name='Headed Round 1 reviewed',tests=str(len(results)),failures=str(sum(r['status']=='Failed' for r in results)),errors=str(sum(r['status']=='Error' for r in results)),skipped=str(sum(r['status']=='Blocked' for r in results)))
    for r in results:
        case=ET.SubElement(suite,'testcase',classname=r['sheet'],name=r['id'],time=str(r.get('duration_seconds',0)))
        if r['status'] in ['Failed','Error','Blocked']:ET.SubElement(case,{'Failed':'failure','Error':'error','Blocked':'skipped'}[r['status']]).text=r.get('failure','')
    ET.ElementTree(root).write(folder/'junit.xml',encoding='utf-8',xml_declaration=True)
    summary=generate(folder,manifest)
    (ROOT/'reports/LATEST.txt').write_text(str(folder),encoding='utf-8')
    print(json.dumps({'folder':str(folder),'counts':summary['counts']},ensure_ascii=False))
    return folder
if __name__=='__main__':
    if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8')
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('base');parser.add_argument('recheck');args=parser.parse_args();consolidate(args.base,args.recheck)
