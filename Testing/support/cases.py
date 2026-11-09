"""Read workbook testcase text without altering the supplied workbook."""
import json,re,hashlib
from pathlib import Path
from openpyxl import load_workbook
ROOT=Path(__file__).resolve().parents[1]
def read_json(path):return json.loads(Path(path).read_text(encoding='utf-8-sig'))
def read_cases(path):
    wb=load_workbook(path,data_only=False,read_only=True)
    cases=[]
    for sheet in wb:
        for row in sheet.iter_rows(min_row=11,max_col=15):
            values=[cell.value for cell in row]
            if isinstance(values[0],str) and re.fullmatch(r'F\d+_TC\d+',values[0]):
                cases.append(dict(sheet=sheet.title,row=row[0].row,id=values[0],description=values[1] or '',procedure=values[2] or '',expected=values[3] or '',preconditions=values[4] or '',source_note=values[14] or ''))
    wb.close()
    return cases
CONFIG=read_json(ROOT/'config.json')
CASES=read_cases(CONFIG['source_workbook'])
def select_cases(*sheets):return [c for c in CASES if c['sheet'] in sheets]
