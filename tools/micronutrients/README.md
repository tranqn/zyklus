# Mikronährstoff-Daten

Hier liegt die Herkunft der Mikronährstoffe, die die Ernährungsseite anzeigt: welches Lebensmittel
aus `src/domain/foods.ts` zu welchem Eintrag in **USDA FoodData Central** gehört.

## Quelle und Lizenz

USDA FoodData Central, Datensatz **SR Legacy** (2018-04). Die Daten sind gemeinfrei (CC0 1.0), der
Bulk-Download braucht keinen API-Key. Die USDA bittet um Nennung als Quelle, das steht in
`NOTICE.md`.

Das CSV-Bündel von **Foundation Foods** wäre inhaltlich der kuratiertere Datensatz, enthält aber
keine Nährstofftabelle, nur Proben- und Labordaten. Es ist deshalb nicht verwendbar; für dessen
Werte bräuchte man die JSON-Variante oder die API.

Der Bundeslebensmittelschlüssel wäre für deutsche Lebensmittel inhaltlich näher, ist aber ein
lizenzpflichtiges Produkt des Max-Rubner-Instituts und für ein öffentliches Repository keine Option.

## Nichts wird automatisch zugeordnet

`pin.json` ist von Hand geschrieben: Lebensmittel-Kennung, USDA-`fdc_id`, Beschreibung. Das ist
Absicht. Ein automatischer Abgleich über Namen und Makros wurde gebaut und wieder verworfen, weil
er bei rund jedem siebten Lebensmittel still etwas Falsches traf, und zwar auf eine Weise, die in
einer Liste plausibel aussieht:

- „Gà luộc" (gekochtes Huhn) landete bei `Chicken, feet, boiled`,
- „Nước mắm" (Fischsauce) bei `Fish, sardine, Pacific, canned in tomato sauce`,
- Apfel bei `Babyfood, apple-banana juice`, später bei `Apples, dried, sulfured, stewed`,
- Butter bei `Margarine-like, butter-margarine blend`,
- Erdnussbutter bei `Peanut butter, chunky, vitamin and mineral fortified` — ein angereichertes
  Produkt verfälscht genau die Werte, um die es hier geht,
- Sojasauce bei der natriumreduzierten Variante, also beim einen Nährstoff, der dort zählt.

Für eine Anzeige, auf die Menschen mit einer Erkrankung schauen, ist das der falsche Kompromiss.
Lieber 33 belegte Lebensmittel als 57 wahrscheinliche.

`build.py` prüft bei jedem Lauf, dass die Beschreibung in `pin.json` noch zu der `fdc_id` in den
heruntergeladenen Daten passt, und bricht sonst ab. Zusätzlich vergleicht es die USDA-Makros mit
denen in `foods.ts` und meldet jede Zuordnung, die weiter als 1,5 auseinanderliegt.

## Erfasste Nährstoffe

| Feld | USDA-Nummer | Einheit |
| --- | --- | --- |
| `iron` | 1089 | mg |
| `calcium` | 1087 | mg |
| `magnesium` | 1090 | mg |
| `zinc` | 1095 | mg |
| `potassium` | 1092 | mg |
| `sodium` | 1093 | mg |
| `vitaminC` | 1162 | mg |
| `iodine` | 1100 | µg |
| `vitaminD` | 1114 | µg |
| `vitaminB12` | 1178 | µg |
| `folate` | 1190 | µg (DFE) |

Ein fehlendes Feld heißt **keine Daten**, nicht null. Jod führt SR Legacy praktisch nirgends,
Vitamin D nur bei Fisch, Pilzen und angereicherten Produkten. Die App hält diese Unterscheidung
durch: ohne Wert gibt es keinen Balken und keine Null, sondern „keine Daten".

## Neu erzeugen

```sh
# 1. Datensatz holen und auspacken, außerhalb des Repos
mkdir -p /tmp/usda && cd /tmp/usda
curl -LO https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
unzip -q FoodData_Central_sr_legacy_food_csv_2018-04.zip

# 2. Lebensmittel der App als JSON
cd /pfad/zu/zyklus
node --experimental-strip-types tools/micronutrients/export-foods.mjs > /tmp/usda/foods.json

# 3. Werte der gepinnten Einträge lesen
python3 -I tools/micronutrients/build.py /tmp/usda /tmp/usda/foods.json \
  tools/micronutrients/usda-mapping.json

# 4. Tabelle für das Bundle erzeugen
node tools/micronutrients/emit-data.mjs
```

## Ein Lebensmittel ergänzen

`suggest.py` zeigt Kandidaten, sortiert nach kürzester Beschreibung, weil der schlichteste Eintrag
der generische ist. Dahinter steht der Makro-Abstand zu den Werten in der App:

```sh
python3 -I tools/micronutrients/suggest.py /tmp/usda /tmp/usda/foods.json tofu,lachs,milch-35
```

Den passenden Eintrag mit Beschreibung in `pin.json` eintragen, dann Schritt 3 und 4 wiederholen.
Die Beschreibung ist nicht Zierde: `build.py` prüft sie gegen die Daten.

## Stand und offene Punkte

33 der 181 Lebensmittel sind gepinnt. Für die übrigen zeigt die App „keine Daten".

- **Kakao** ist gepinnt und richtig (`Cocoa, dry powder, unsweetened`), aber `build.py` meldet
  einen Makro-Abstand von 4,9. Die Ursache liegt in `foods.ts`: der Eintrag dort hat 360 kcal bei
  20 g Protein, 11 g Kohlenhydraten und 11 g Fett, was rund 223 kcal ergibt. Die Kalorienangabe
  des Lebensmittels ist falsch, nicht die Zuordnung.
- Die **56 vietnamesischen Fertiggerichte** haben in `foods.ts` keine Zutatenliste, und eine
  maschinenlesbare vietnamesische Nährwerttabelle existiert nicht. Entschieden wurde, sie zu
  schätzen und sichtbar als Schätzung zu kennzeichnen; die Schätzungen sind noch nicht erfasst.
  Das Datenmodell muss dafür ein Herkunftsfeld bekommen, damit der Anteil der Schätzungen in der
  Tagesansicht ablesbar bleibt.
- Die **35 Gerichte des Planers** brauchen keine eigenen Werte: sie bestehen in
  `src/domain/meals.ts` aus Zutat plus Gramm, `dishMicros` summiert sie und sagt, wie viele
  Zutaten abgedeckt waren.
