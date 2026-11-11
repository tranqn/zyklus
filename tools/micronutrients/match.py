#!/usr/bin/env python3
"""
Maps the built-in foods to USDA FoodData Central and reads eleven micronutrients per 100 g.

    python3 -I tools/micronutrients/match.py <usda-dir> <foods.json> <out.json>

See README.md for where the datasets come from and how the matching decides. Run it with -I: the
USDA directory holds downloaded data, and an interpreter that adds the script's own directory to
the import path would load anything named like a module from there.
"""
import csv, json, re, sys
from pathlib import Path

USDA = Path(sys.argv[1]); FOODS = json.load(open(sys.argv[2], encoding='utf-8'))
MACRO = {'1008': 'kcal', '1003': 'protein', '1005': 'carbs', '1004': 'fat'}
MICRO = {'1089': 'iron', '1087': 'calcium', '1090': 'magnesium', '1095': 'zinc', '1092': 'potassium',
         '1100': 'iodine', '1114': 'vitaminD', '1178': 'vitaminB12', '1190': 'folate',
         '1162': 'vitaminC', '1093': 'sodium'}
WANTED = set(MACRO) | set(MICRO)
BAD = re.compile(r'babyfood|infant|formula|margarine-like|\bfilled\b|restaurant|fast ?food|school|'
                 r'denny|mcdonald|burger king|wendy|subway|pizza hut|taco bell|applebee|carl', re.I)
BRAND = re.compile(r'\b[A-Z]{3,}\b')

desc, nutr = {}, {}
for sub in sorted(USDA.iterdir()):
    p = sub / 'food.csv'
    if p.exists():
        with open(p, encoding='utf-8', newline='') as fh:
            for r in csv.DictReader(fh):
                if not BAD.search(r['description']) and not BRAND.search(r['description']):
                    desc[r['fdc_id']] = r['description']
    p = sub / 'food_nutrient.csv'
    if p.exists():
        with open(p, encoding='utf-8', newline='') as fh:
            for r in csv.DictReader(fh):
                if r['nutrient_id'] in WANTED and r['amount']:
                    nutr.setdefault(r['fdc_id'], {})[r['nutrient_id']] = float(r['amount'])

PREP = {'raw', 'cooked', 'boiled', 'dry', 'dried', 'canned', 'roasted', 'frozen'}
# a part or variety that makes it a different food: chicken FEET is not chicken, broccoli
# LEAVES is not broccoli, a SARDINE is not fish sauce
DISQUALIFY = {'leave', 'leaf', 'feet', 'foot', 'liver', 'heart', 'gizzard', 'neck', 'skin',
              'juice', 'sardine', 'anchovy', 'welsh', 'raab', 'baby', 'sprout', 'seed',
              'flower', 'stalk', 'top', 'root', 'dehydrated', 'concentrate', 'puree'}
STOP = {'fresh', 'skinless', 'lean', 'whole', 'and', 'or', 'with', 'without', 'the', 'of', 'in', 'uncooked'}
def stem(t):
    if t.endswith('oes'): return t[:-2]
    if t.endswith('ies'): return t[:-3] + 'y'
    if len(t) > 4 and t.endswith('s') and not t.endswith('ss'): return t[:-1]
    return t
def words(s):
    return [w for w in re.split(r'[^a-zà-ÿ]+', re.sub(r'[()]', ' ', s.lower())) if len(w) > 2]
def keywords(s):
    return [stem(w) for w in words(s) if w not in STOP and w not in PREP]

def prep_of(s):
    w = set(words(s))
    if 'uncooked' in w or 'dry' in w: w.add('dry')
    return w & PREP

head_first, head_set, full_set, prep_set = {}, {}, {}, {}
for k, v in desc.items():
    seg = keywords(v.split(',')[0])
    head_first[k] = seg[0] if seg else ''
    head_set[k] = set(seg)
    full_set[k] = set(keywords(v))
    prep_set[k] = prep_of(v)

def dist(got, want):
    return sum(abs(got.get(k, 0) - want[k]) / max(want[k], f)
               for k, f in (('kcal', 25.0), ('protein', 2.0), ('carbs', 2.0), ('fat', 2.0)))

out, report = {}, []
for f in FOODS:
    want = keywords(f['en']); wprep = prep_of(f['en'])
    best = None
    if want:
        for fid, first in head_first.items():
            if first != want[0]:                                    # the noun must head the entry
                continue
            if len(want) > 1 and not set(want[1:]) <= full_set[fid]:  # qualifiers must appear too
                continue
            n = nutr.get(fid)
            if not n or '1008' not in n:
                continue
            # an extra noun in the head segment means a different food: "Sweet potato LEAVES",
            # "Tomato JUICE", "Broccoli RAAB", "Onions, WELSH"
            if (full_set[fid] & DISQUALIFY) - set(want):
                continue
            penalty = 3 * len(head_set[fid] - set(want))
            penalty += 0 if not wprep else (0 if wprep & prep_set[fid] else 2)
            if not wprep and 'raw' in prep_set[fid]:
                penalty -= 0.5                                      # plain name means the plain food
            score = penalty + dist({MACRO[k]: v for k, v in n.items() if k in MACRO}, f['per100'])
            if best is None or score < best[1]:
                best = (fid, score, dist({MACRO[k]: v for k, v in n.items() if k in MACRO}, f['per100']))
    report.append((f, best))
    if best:
        fid = best[0]
        entry = {'fdcId': int(fid), 'usda': desc[fid], 'macroDelta': round(best[2], 2),
                 'values': {MICRO[k]: v for k, v in sorted(nutr[fid].items()) if k in MICRO}}
        # the macros of a correct match should land near the ones already in the app; further
        # away means the entry describes something else, or a different preparation
        if best[2] > 1.0:
            entry['review'] = 'macros differ, check the match by hand'
        out[f['id']] = entry

print(f'zugeordnet: {len(out)} von {len(report)}', file=sys.stderr)
json.dump(out, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
for f, b in report:
    if not b: print(f'  --     {f["id"]:<26} {f["en"][:38]:<38} KEIN KANDIDAT')
    else: print(f'  {b[2]:5.2f} {f["id"]:<26} {f["en"][:38]:<38} -> {desc[b[0]][:56]}')
