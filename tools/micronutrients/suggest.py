import csv, json, re, sys
from pathlib import Path
USDA = Path(sys.argv[1]); FOODS = json.load(open(sys.argv[2], encoding='utf-8'))
ONLY = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
MACRO = {'1008':'kcal','1003':'protein','1005':'carbs','1004':'fat'}
desc, nutr = {}, {}
for sub in sorted(USDA.iterdir()):
    p = sub/'food.csv'
    if p.exists():
        for r in csv.DictReader(open(p, encoding='utf-8', newline='')): desc[r['fdc_id']] = r['description']
    p = sub/'food_nutrient.csv'
    if p.exists():
        for r in csv.DictReader(open(p, encoding='utf-8', newline='')):
            if r['nutrient_id'] in MACRO and r['amount']:
                nutr.setdefault(r['fdc_id'], {})[MACRO[r['nutrient_id']]] = float(r['amount'])
def stem(t):
    if t.endswith('oes'): return t[:-2]
    if t.endswith('ies'): return t[:-3]+'y'
    if len(t) > 4 and t.endswith('s') and not t.endswith('ss'): return t[:-1]
    return t
def kw(s): return [stem(w) for w in re.split(r'[^a-zà-ÿ]+', re.sub(r'[()]',' ',s.lower())) if len(w) > 2]
head = {k: (kw(v.split(',')[0])[:1] or ['']) [0] for k, v in desc.items()}
for f in FOODS:
    if ONLY and f['id'] not in ONLY: continue
    want = kw(f['en'])
    if not want: continue
    cand = []
    for fid, h in head.items():
        if h != want[0] or fid not in nutr or 'kcal' not in nutr[fid]: continue
        n = nutr[fid]
        d = sum(abs(n.get(k,0)-f['per100'][k])/max(f['per100'][k],fl)
                for k,fl in (('kcal',25.0),('protein',2.0),('carbs',2.0),('fat',2.0)))
        cand.append((len(desc[fid]), d, fid))
    cand.sort()                                    # shortest description first: the plain entry
    print(f'{f["id"]:<20} {f["en"][:34]:<34} {f["per100"]["kcal"]:>4} kcal')
    for _, d, fid in cand[:5]:
        print(f'    {fid:>7} d={d:4.2f}  {desc[fid][:66]}')
