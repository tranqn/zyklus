# Fremde Arbeit in diesem Projekt

Zyklus ist eigenständig geschrieben. Was von anderen kommt, steht hier.

## Nährwertdaten

Die eingebaute Lebensmittel-Datenbank (`src/domain/foods.ts`) stützt sich auf drei Quellen:

- **Bundeslebensmittelschlüssel (BLS)** des Max Rubner-Instituts. Der BLS ist ein
  lizenzpflichtiges Produkt; die Werte hier sind gerundete Orientierungswerte für
  Standardlebensmittel, keine Kopie des Datensatzes.
- **USDA FoodData Central** (U.S. Department of Agriculture), gemeinfrei.
- **Bảng thành phần thực phẩm Việt Nam** des Viện Dinh dưỡng Quốc gia, für die
  vietnamesischen Gerichte.

Die Werte sind Orientierung, keine Laboranalyse, und keine medizinische Auskunft.

## Open Food Facts

Die Produktsuche und der Barcode-Scanner fragen **Open Food Facts** ab
(`src/domain/openfoodfacts.ts`).

> Produktdaten aus Open Food Facts, © Open Food Facts contributors,
> Datenbank unter der **Open Database License (ODbL) 1.0**, einzelne Inhalte unter
> **CC BY-SA 3.0**. https://world.openfoodfacts.org

Was aus Open Food Facts in ein Konto übernommen wird, ist ein Auszug dieser Datenbank und
bleibt an diese Lizenz gebunden. Die Abfrage läuft ohne Schlüssel und ohne Konto.

## Quellcode von anderen

- **shadcn/ui** (MIT) — zwölf Komponenten liegen als Quellcode im Projekt, nicht als
  Abhängigkeit: `src/components/ui/`. Konfiguration in `components.json`.
- **React**, **React DOM**, **React Router** (MIT)
- **Radix UI**, **@radix-ui/react-slot** (MIT)
- **lucide-react** (ISC) — Symbole
- **lottie-web** (MIT) — spielt die Übungsanimationen
- **barcode-detector** (MIT) — Ersatzimplementierung für Browser ohne `BarcodeDetector`
- **class-variance-authority** (Apache-2.0), **clsx**, **tailwind-merge**, **zustand** (MIT)
- **Tailwind CSS**, **Vite**, **TypeScript**, **Vitest**, **Playwright**, **oxlint** (MIT bzw.
  Apache-2.0) als Werkzeuge

Die vollständigen Lizenztexte liegen in `node_modules/<paket>/LICENSE`.

## Eigene Arbeit

Die Übungsanimationen in `public/anim/` sind in diesem Projekt erzeugt (`tools/anim/`, Rig und
Muster sind eigener Code) und mit der EffectCraft-CLI gerendert. Das App-Symbol
(`public/icon.svg`) ist selbst gezeichnet. Die Schrift **Inter** wird nur über den
Familiennamen angesprochen, ohne mitgelieferte Schriftdatei, und fällt sonst auf die
Systemschrift zurück.

## Kein Bezug zur MCI-App

Zyklus ist am Funktionsumfang der MCI-App orientiert und davon unabhängig umgesetzt. Es
enthält keinen Code, keine Texte, keine Grafiken und keine Daten von MCI Solutions und steht in
keiner Verbindung zu diesem Unternehmen.
