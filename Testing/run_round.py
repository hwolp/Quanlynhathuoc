"""Start isolated app instances, run exactly one round, retain reproducible evidence."""
import argparse,json,os,platform,shutil,socket,subprocess,sys,time,hashlib
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen
from support.cases import ROOT,CONFIG,CASES
from reporting.reports import generate
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr,'reconfigure'):sys.stderr.reconfigure(encoding='utf-8')
PROJECT=ROOT.parent

def file_hash(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def source_snapshot():
    files=[]
    for base in [PROJECT/'FE/src',PROJECT/'BE/app']:
        files.extend(p for p in base.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    files+=[PROJECT/'FE/vite.config.ts',PROJECT/'BE/requirements.txt']
    return {str(p.relative_to(PROJECT)):file_hash(p) for p in sorted(files)}
def port_free(port):
    with socket.socket() as sock:return sock.connect_ex(('127.0.0.1',port))!=0
def ready(url,process):
    for _ in range(150):
        if process.poll() is not None:raise RuntimeError(f'Server exited before readiness: {url}')
        try:
            with urlopen(url,timeout=2) as response:
                if response.status==200:return
        except Exception:pass
        time.sleep(.2)
    raise RuntimeError(f'Server not ready: {url}')
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--round',type=int,default=1,choices=[1,2,3])
    parser.add_argument('--module',choices=['all','registration','inventory'],default='all')
    parser.add_argument('--headed',action='store_true',help='Override headless config for this run.')
    parser.add_argument('--case',help='pytest -k expression, e.g. F2_TC012')
    options=parser.parse_args()
    if options.headed:os.environ['QA_HEADED']='1'
    source=Path(CONFIG['source_workbook']);stamp=datetime.now().strftime('%Y%m%d_%H%M%S')
    run_id=f'Round_{options.round}_{stamp}';report=ROOT/'reports'/run_id;run=ROOT/'runs'/run_id
    report.mkdir(parents=True);run.mkdir(parents=True)
    database=run/'qa.db';processes=[];handles=[]
    initial=source_snapshot();source_sha=file_hash(source)
    manifest={'run_id':run_id,'round':options.round,'module':options.module,'started_at':datetime.now().astimezone().isoformat(),'source_workbook':str(source),'source_sha256':source_sha,'source_rows':len(CASES),'unique_test_ids':len({c['id'] for c in CASES}),'excluded':'Feature 1 chứa placeholder; headings không phải testcase. Feature 6 trùng F5_TC001 nhưng chạy độc lập.','database':str(database),'base_url':CONFIG['base_url'],'api_url':CONFIG['api_url'],'python':sys.version,'platform':platform.platform(),'application_hashes_before':initial}
    shutil.copy2(source,report/'Test_Report_2.source.xlsx')
    (report/'cases.json').write_text(json.dumps(CASES,ensure_ascii=False,indent=2),encoding='utf-8')
    redacted=json.loads(json.dumps(CONFIG))
    for value in redacted['credentials'].values():value['password']='***'
    (report/'config_snapshot.json').write_text(json.dumps(redacted,ensure_ascii=False,indent=2),encoding='utf-8')
    code=3
    try:
        for port in [CONFIG['backend_port'],CONFIG['frontend_port']]:
            if not port_free(port):raise RuntimeError(f'Cổng QA {port} đang được sử dụng. Đổi config.json, không dừng tiến trình khác.')
        python=PROJECT/'BE/.venv/Scripts/python.exe'
        if not python.is_file():raise RuntimeError('Thiếu BE/.venv; cài dependencies backend trước khi chạy.')
        env={**os.environ,'PYTHONIOENCODING':'utf-8','PYTHONUTF8':'1','DATABASE_URL':'sqlite:///'+str(database).replace('\\','/')}
        def start(command,cwd,log,environment):
            stream=(report/log).open('w',encoding='utf-8');handles.append(stream)
            proc=subprocess.Popen(command,cwd=cwd,env=environment,stdout=stream,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
            processes.append(proc);return proc
        backend=start([str(python),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(CONFIG['backend_port'])],PROJECT/'BE','backend.log',env)
        vite=PROJECT/'FE/node_modules/vite/bin/vite.js';node=shutil.which('node')
        frontend=start([node,str(vite),'--host','127.0.0.1','--port',str(CONFIG['frontend_port']),'--strictPort'],PROJECT/'FE','frontend.log',{**os.environ,'API_PROXY_TARGET':f'http://127.0.0.1:{CONFIG["backend_port"]}','VITE_API_BASE_URL':'/api/v1'})
        ready(f'http://127.0.0.1:{CONFIG["backend_port"]}/health',backend);ready(CONFIG['base_url'],frontend)
        tests={'all':['tests/test_registration.py','tests/test_inventory.py'],'registration':['tests/test_registration.py'],'inventory':['tests/test_inventory.py']}[options.module]
        command=[sys.executable,'-m','pytest',*tests,'-v',f'--junitxml={report/"junit.xml"}']
        if options.case:command+=['-k',options.case]
        test_env={**os.environ,'PYTHONIOENCODING':'utf-8','PYTHONUTF8':'1','QA_REPORT_DIR':str(report),'QA_DB_FILE':str(database),'QA_ROUND':str(options.round)}
        print(f'Running {run_id}; dedicated Chromium + SQLite; output: {report}',flush=True)
        with (report/'pytest.log').open('w',encoding='utf-8') as log:
            test=subprocess.Popen(command,cwd=ROOT,env=test_env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
            processes.append(test)
            for line in test.stdout:print(line,end='',flush=True);log.write(line);log.flush()
            code=test.wait()
    except Exception as error:
        manifest['infrastructure_error']=str(error);print(str(error),file=sys.stderr)
    finally:
        for process in reversed(processes):
            if process.poll() is None:
                process.terminate()
                try:process.wait(timeout=5)
                except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)
        for handle in handles:handle.close()
        manifest['finished_at']=datetime.now().astimezone().isoformat();manifest['pytest_exit_code']=code
        manifest['source_unchanged']=file_hash(source)==source_sha
        manifest['application_source_unchanged']=source_snapshot()==initial
        (report/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
        if (report/'results.json').exists():
            summary=generate(report,manifest);print(json.dumps(summary['counts'],ensure_ascii=False),flush=True)
        (ROOT/'reports/LATEST.txt').write_text(str(report),encoding='utf-8')
    return code
if __name__=='__main__':raise SystemExit(main())
