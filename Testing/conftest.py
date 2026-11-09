"""pytest fixtures and evidence collection, shared by all modules."""
import json,os,re,sys,platform
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
import pytest
from playwright.sync_api import sync_playwright,expect
from support.cases import ROOT,CONFIG,CASES
from support.database import QaDatabase
REPORT_DIR=Path(os.environ.get('QA_REPORT_DIR',ROOT/'reports'/'unmanaged')).resolve()
RESULTS=[]
def write_json(path,value):Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
@pytest.fixture(scope='session')
def browser():
    assert os.environ.get('QA_DB_FILE'),'Dùng python run_round.py --round 1 để tự tạo database QA cô lập.'
    expect.set_options(timeout=CONFIG['assert_timeout_ms'])
    with sync_playwright() as playwright:
        effective_headless=False if os.environ.get('QA_HEADED') else bool(CONFIG.get('headless',False))
        options={'headless':effective_headless,'slow_mo':0 if effective_headless else CONFIG.get('slow_mo_ms',200)}
        if CONFIG.get('browser_channel') and CONFIG['browser_channel']!='chromium':options['channel']=CONFIG['browser_channel']
        browser=playwright.chromium.launch(**options)
        write_json(REPORT_DIR/'browser.json',{'engine':'Chromium','version':browser.version,'headless':effective_headless,'slow_mo_ms':options['slow_mo'],'viewport':CONFIG['viewport'],'python':sys.version,'platform':platform.platform()})
        yield browser
        browser.close()
@pytest.fixture
def qa(case,request,browser):
    db=QaDatabase(os.environ['QA_DB_FILE']);db.reset(empty_inventory=case['id']=='F5_TC025')
    key=case['sheet'].replace(' ','_')+'__'+case['id'];evidence=REPORT_DIR/'evidence'/key;evidence.mkdir(parents=True,exist_ok=True)
    context=browser.new_context(viewport=CONFIG['viewport'],locale='vi-VN',timezone_id='Asia/Ho_Chi_Minh')
    context.set_default_timeout(CONFIG['timeout_ms']);context.tracing.start(screenshots=True,snapshots=True,sources=True)
    page=context.new_page();record=request.node._qa_record;record['evidence_dir']=str(evidence.relative_to(REPORT_DIR))
    page.on('console',lambda message:record['console'].append({'type':message.type,'text':message.text[:2000]}))
    page.on('pageerror',lambda error:record['console'].append({'type':'pageerror','text':str(error)}))
    page.on('response',lambda response:record['network'].append({'method':response.request.method,'url':response.url,'status':response.status}) if '/api/' in response.url else None)
    # Read-only instrumentation captures transient notification text, even when immediately removed.
    page.add_init_script("""window.__qaNotifications=[];document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes){const text=(node.textContent||'').trim();if(text.length<500&&/tạo.{0,100}thành công|thêm.{0,100}thành công/i.test(text))window.__qaNotifications.push(text);}}).observe(document.body,{childList:true,subtree:true});});""")
    environment=SimpleNamespace(page=page,context=context,db=db,record=record,evidence=evidence)
    yield environment
    try:
        if not CONFIG.get('headless',False) or os.environ.get('QA_HEADED'):
            page.wait_for_timeout(CONFIG.get('case_hold_ms',1200))
        context.tracing.stop(path=evidence/'trace.zip')
        record['trace']=str((evidence/'trace.zip').relative_to(REPORT_DIR))
    finally:context.close()
    # Undo only QA data. Retain a clean inventory fixture between cases.
    db.reset()

def pytest_runtest_setup(item):
    if hasattr(item,'callspec') and 'case' in item.callspec.params:
        case=item.callspec.params['case']
        record={**case,'nodeid':item.nodeid,'round':int(os.environ.get('QA_ROUND','1')),'tester':CONFIG['tester'],'started_at':datetime.now().astimezone().isoformat(),'status':'Pending','observations':[],'measurements':{},'console':[],'network':[],'ui_notifications':[]}
        item._qa_record=record;RESULTS.append(record)
@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item,call):
    outcome=yield;report=outcome.get_result()
    if not hasattr(item,'_qa_record'):return
    record=item._qa_record
    if report.when=='call' or (report.failed and report.when!='call'):
        record['status']='Passed' if report.passed else 'Blocked' if report.skipped else 'Failed' if report.when=='call' else 'Error'
        record['duration_seconds']=round(report.duration,4)
        record['finished_at']=datetime.now().astimezone().isoformat()
        record['failure']=str(report.longrepr) if not report.passed else ''
        qa=item.funcargs.get('qa')
        if qa:
            try:
                record['ui_notifications']+=qa.page.evaluate('window.__qaNotifications || []')
                record['page_url']=qa.page.url
                record['page_text']=qa.page.locator('body').inner_text()[:18000]
                qa.page.screenshot(path=qa.evidence/'screenshot.png',full_page=True,timeout=10000)
                record['screenshot']=str((qa.evidence/'screenshot.png').relative_to(REPORT_DIR))
                (qa.evidence/'page.html').write_text(qa.page.content(),encoding='utf-8')
            except Exception as error:record['evidence_error']=str(error)
            write_json(qa.evidence/'observations.json',record)
        write_json(REPORT_DIR/'results.partial.json',RESULTS)

def pytest_sessionfinish(session,exitstatus):
    REPORT_DIR.mkdir(parents=True,exist_ok=True)
    write_json(REPORT_DIR/'results.json',RESULTS)
