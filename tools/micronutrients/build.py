#!/usr/bin/env python3
"""
Reads the micronutrients of the pinned USDA entries and writes usda-mapping.json.

    python3 -I tools/micronutrients/build.py <usda-dir> <foods.json> <out.json>

Only what pin.json names is written. Nothing is matched automatically: see README.md for why.
Run it with -I, because <usda-dir> holds downloaded data and an interpreter that adds a script's
own directory to the import path would load anything named like a module from there.
"""
import csv
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
USDA, FOODS_JSON, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])

MACRO = {'1008': 'kcal', '1003': 'protein', '1005': 'carbs', '1004': 'fat'}
MICRO = {'1089': 'iron', '1087': 'calcium', '1090': 'magnesium', '1095': 'zinc',
         '1092': 'potassium', '1093': 'sodium', '1100': 'iodine', '1114': 'vitaminD',
         '1178': 'vitaminB12', '1190': 'folate', '1162': 'vitaminC'}

pin = {k: v for k, v in json.loads((HERE / 'pin.json').read_text(encoding='utf-8')).items()
       if not k.startswith('_')}
foods = {f['id']: f for f in json.loads(FOODS_JSON.read_text(encoding='utf-8'))}
want_ids = {str(fdc) for fdc, _ in pin.values()}

desc, nutr = {}, {}
for sub in sorted(USDA.iterdir()):
    p = sub / 'food.csv'
    if p.exists():
        with open(p, encoding='utf-8', newline='') as fh:
            for r in csv.DictReader(fh):
                if r['fdc_id'] in want_ids:
                    desc[r['fdc_id']] = r['description']
    p = sub / 'food_nutrient.csv'
    if p.exists():
        with open(p, encoding='utf-8', newline='') as fh:
            for r in csv.DictReader(fh):
                if r['fdc_id'] in want_ids and r['nutrient_id'] in (MACRO | MICRO) and r['amount']:
                    nutr.setdefault(r['fdc_id'], {})[r['nutrient_id']] = float(r['amount'])

out, problems = {}, []
for food_id, (fdc, noted) in sorted(pin.items()):
    fdc = str(fdc)
    if food_id not in foods:
        problems.append(f'{food_id}: not a food in foods.ts any more'); continue
    if fdc not in desc:
        problems.append(f'{food_id}: fdc_id {fdc} is not in the downloaded datasets'); continue
    if desc[fdc] != noted:
        problems.append(f'{food_id}: pin.json says "{noted}", USDA says "{desc[fdc]}"')
    n = nutr.get(fdc, {})
    got = {MACRO[k]: v for k, v in n.items() if k in MACRO}
    per100 = foods[food_id]['per100']
    delta = sum(abs(got.get(k, 0) - per100[k]) / max(per100[k], fl)
                for k, fl in (('kcal', 25.0), ('protein', 2.0), ('carbs', 2.0), ('fat', 2.0)))
    out[food_id] = {
        'fdcId': int(fdc),
        'usda': desc[fdc],
        # how far the USDA macros are from the ones already in the app: a sanity check on the
        # pin, not a gate. Rounded orientation values in foods.ts make some gap normal.
        'macroDelta': round(delta, 2),
        'values': {MICRO[k]: v for k, v in sorted(n.items()) if k in MICRO},
    }

OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True) + '\n', encoding='utf-8')
print(f'{len(out)} von {len(pin)} gepinnten Lebensmitteln geschrieben -> {OUT}')
far = [(k, v['macroDelta']) for k, v in out.items() if v['macroDelta'] > 1.5]
if far:
    print('Makros weit auseinander, Pin pruefen:')
    for k, d in sorted(far, key=lambda x: -x[1]):
        print(f'  {d:5.2f}  {k}  ->  {out[k]["usda"]}')
for p in problems:
    print('PROBLEM:', p, file=sys.stderr)
sys.exit(1 if any('not' in p or 'says' in p for p in problems) else 0)
