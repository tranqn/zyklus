# Mikronährstoff-Daten

Diese Werkzeuge ordnen die eingebauten Lebensmittel aus `src/domain/foods.ts` Einträgen in
**USDA FoodData Central** zu und lesen daraus elf Mikronährstoffe pro 100 g.

Die Zuordnung ist bewusst ein eingechecktes, prüfbares Artefakt (`usda-mapping.json`) und kein
Nebenprodukt eines Skripts: an jedem Wert steht, aus welchem USDA-Eintrag er kommt. Bei einer App
für Menschen, die auf Mangelzustände achten, muss jede Zahl nachvollziehbar sein.

## Quelle und Lizenz

USDA FoodData Central, Datensätze **SR Legacy** (2018-04) und **Foundation Foods**. Die Daten sind
gemeinfrei (CC0 1.0), für den Bulk-Download braucht es keinen API-Key. Die USDA bittet um Nennung
als Quelle, das steht in `NOTICE.md`.

Der Bundeslebensmittelschlüssel wäre für deutsche Lebensmittel inhaltlich näher, ist aber ein
lizenzpflichtiges Produkt des Max-Rubner-Instituts und für ein öffentliches Repository keine Option.

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

Ein fehlendes Feld heißt **keine Daten**, nicht null. Jod fehlt in USDA bei den meisten
Lebensmitteln, Vitamin D bei allem außer Fisch, Pilzen und angereicherten Produkten. Diese
Unterscheidung muss die App durchhalten: für jemanden, der auf einen Mangel achtet, darf eine Lücke
nicht wie ein Defizit aussehen.

## Neu erzeugen

```sh
# 1. Datensätze holen und auspacken (irgendein Verzeichnis außerhalb des Repos)
mkdir -p /tmp/usda && cd /tmp/usda
curl -LO https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
curl -LO https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2026-10-29.zip
unzip -q '*.zip'

# 2. Die Lebensmittel der App als JSON ausgeben
cd /pfad/zu/zyklus
node --experimental-strip-types tools/micronutrients/export-foods.mjs > /tmp/usda/foods.json

# 3. Zuordnen
python3 -I tools/micronutrients/match.py /tmp/usda /tmp/usda/foods.json \
  tools/micronutrients/usda-mapping.json
```

## Wie zugeordnet wird

Ein Name allein genügt nicht, Makros allein auch nicht. Beides zusammen trägt:

1. **Das Hauptwort muss der Eintrag selbst sein.** USDA schreibt `Substantiv, Zusatz, Zusatz`, also
   muss das erste Schlagwort des englischen Namens das erste Schlagwort im ersten Komma-Abschnitt
   sein. Sonst wird aus Spinat die „Malabar spinach".
2. **Ausschlussliste.** Enthält der Eintrag ein Körper- oder Pflanzenteil, das die App nicht gemeint
   hat (`feet`, `leaves`, `juice`, `sardine`, `welsh`, `baby` und weitere), fällt er heraus. Ohne das
   wurde aus „Gà luộc" Hühnerfüße und aus „Nước mắm" Sardinen in Tomatensauce.
3. **Marken und Babynahrung** fliegen vorher raus, sonst gewinnt „Babyfood, apple-banana juice"
   gegen den Apfel.
4. **Zubereitung.** Steht im Namen `(raw)`, `(cooked)` oder `(dry)`, wird ein Eintrag mit derselben
   Zubereitung bevorzugt. Ohne Angabe gewinnt der rohe Eintrag.
5. **Makro-Abstand als Stichentscheid.** Unter den verbliebenen Kandidaten gewinnt der, dessen
   kcal, Protein, Kohlenhydrate und Fett am nächsten an den Werten liegen, die in der App stehen.
   Der Abstand steht als `macroDelta` an jedem Eintrag.

`macroDelta` über 1,0 setzt ein `review`-Feld. Das heißt **nicht** automatisch falsch: die Werte in
der App sind gerundete Orientierungswerte, deshalb liegen auch richtige Treffer wie Spinat, Avocado
oder Kakao weit auseinander. Es heißt: hier muss ein Mensch hinsehen.

## Stand

57 der 181 Lebensmittel sind zugeordnet, 9 davon zur Prüfung markiert. Die übrigen 124 haben keinen
Kandidaten, darunter fast alle vietnamesischen Fertiggerichte: die sind in `foods.ts` keine Zutaten,
sondern fertige Gerichte, und eine maschinenlesbare vietnamesische Nährwerttabelle gibt es nicht.

Noch zu tun, bevor die Daten in der App landen:

- die 9 markierten Zuordnungen durchsehen (vor allem `sojasauce`, `thit-luoc` und `rind-mager`),
- für die vietnamesischen Gerichte Schätzwerte aus einer typischen Zusammensetzung hinterlegen und
  im Datenmodell als Schätzung kennzeichnen,
- die 35 Gerichte des Planers brauchen keine eigenen Werte: sie bestehen in `src/domain/meals.ts`
  aus Zutat plus Gramm und summieren sich von selbst.
