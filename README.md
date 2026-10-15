# Zyklus

Mobile-first Trainings-PWA, inspiriert vom Funktionsumfang der MCI-App (MCI Solutions), komplett eigenständig umgesetzt. Live unter https://mci.quocnamtran.com.

## Was die App kann

- **Onboarding**: Ziel, Erfahrung, Ort und Ausstattung, Trainingstage, Dauer, Körperdaten, Alltagsaktivität
- **Plangenerator**: Split nach Tagen (2x Ganzkörper bis 6x Push/Pull/Beine), Übungsauswahl nach Ausstattung und Level, Satzzahl passend zur Trainingsdauer, Supersätze bei kurzen Einheiten
- **Mesozyklen**: 5 bis 6 Wochen, RIR sinkt von 3 auf 1 (Profis 0), Volumen steigt, letzte Woche Deload; Auswertung mit Empfehlung für den nächsten Zyklus, Zusatzübungen rotieren
- **Krafttest und Progression**: Testsatz bei neuen Übungen (Epley-Schätzung), danach doppelte Progression, Aufwärmsätze
- **Tagesform-Check-in**: Schlaf, Energie, Stress, Muskelkater pro Muskel steuern Sätze und RIR
- **Training**: Satz-Logging (kg, Wdh., RIR), Satzpausen-Timer mit Ton und Vibration, Übung tauschen (einmalig oder dauerhaft), Bildschirm bleibt an
- **Plan editieren**: Sätze, Wdh.-Bereich, Pausen, Reihenfolge, Übungen hinzufügen, entfernen, ausschließen, eigene Übungen
- **Ernährung**: Kalorien- und Makroziele (Mifflin-St Jeor), Mahlzeiten, 95 Grundnahrungsmittel offline, Open Food Facts Suche und Barcode-Scanner, Freitext-Eingabe ("150g Hähnchen, 2 Eier"), eigene Lebensmittel, Rezepte (Mahlzeit speichern, portionsweise eintragen), „Wie gestern", Supplement-Tracker, smarte Kalorienanpassung nach Gewichtstrend
- **Fortschritt**: Kalender, Serie, Muskel-Map (Sätze pro Muskel und Woche), 1RM-Verlauf, Bestleistungen, Gewichtstrend, Körpermaße (Taille, Hüfte, Arme, Körperfett), Trainingsverlauf
- **Mobility und Cardio**: 7 geführte Routinen mit Timer, 22 Cardio-Aktivitäten mit MET-basiertem Kalorienverbrauch
- **Urlaubs- und Krankheitsmodus**: Plan und Serie pausieren, leichter Wiedereinstieg
- **Konten**: Registrierung mit E-Mail und Passwort (Pflicht), E-Mail-Bestätigung, Passwort-Reset, Datenexport, Kontolöschung; Daten werden zwischen Geräten synchronisiert (offline-fähig, Konflikte werden pro Eintrag zusammengeführt)
- **Übungsanimationen**: 31 animierte Bewegungsmuster für rund 65 Übungen, erzeugt mit EffectCraft (`pnpm anim`, siehe `tools/anim/`), als Lottie im Übungs-Infoblatt
- **Sprachen**: Deutsch, English, Tiếng Việt mit voller Parität: Oberfläche, Übungstexte, Mobility, Cardio, E-Mails, Fehlermeldungen, Rechtstexte; vietnamesische Gerichte und Portionen (tô, chén, ly) in der Lebensmittel-Datenbank, Freitext-Erfassung je Sprache (auch ohne Diakritika); Sprache folgt dem Browser, ist umschaltbar und wird mit dem Konto synchronisiert
- **PWA**: installierbar, offline nutzbar

## Entwicklung

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm verify     # tsc, oxlint, vitest
pnpm e2e        # Playwright, mobiles Viewport (Pixel 7)
pnpm build
```

Die Fachlogik liegt in `src/domain/`, die Synchronisierung in `src/sync/`, die API in `server/` (Hono + node:sqlite, `pnpm --dir server dev` auf Port 8787) (ohne React, mit Tests in `src/domain/__tests__/`), die Oberfläche in `src/pages/` und `src/ui/`.

## Übersetzungen

Texte liegen pro Bereich in `src/i18n/ns/*.ts`, jeweils Deutsch, Englisch und Vietnamesisch nebeneinander. Deutsch ist die Quelle; fehlt ein Schlüssel in einer Sprache, bricht `tsc` ab. Übungstexte stehen in `src/i18n/content/exercises.ts`, Lebensmittel und Aktivitäten direkt in den Domain-Daten.

```sh
pnpm i18n:review   # docs/i18n-review.md: alle Texte in drei Sprachen nebeneinander, zum Gegenlesen
```

## Animationen neu erzeugen

Braucht die EffectCraft-CLI (`EFFECTCRAFT_CLI=/pfad/zu/effectcraft-cli`, Standard `~/tools/effectcraft/...`):

```sh
pnpm anim                 # alle Muster nach public/anim/
pnpm anim squat --frames  # ein Muster, plus PNG-Kontrollbilder in tools/anim/.work/
```

## Vor dem öffentlichen Betrieb

- In `src/pages/Legal.tsx` Anschrift und Kontakt-E-Mail eintragen (Platzhalter in eckigen Klammern).

## Deployment

Push auf `main`: GitHub baut und testet (inklusive Playwright), dann deployt der Self-hosted-Runner zuerst die API (`deploy zyklus-api <sha>`, Compose) und danach das Frontend auf dem Hetzner-Server mit `/opt/ci/bin/deploy zyklus --from site`. Caddy-Block und Projektkonfiguration liegen als Kopie in `deploy/`.
