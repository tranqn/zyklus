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

Vorausgesetzt sind Node (Version in `.nvmrc`) und pnpm (Version in `package.json`, Feld `packageManager`).

```sh
pnpm install
pnpm --dir server install

pnpm --dir server dev   # API auf http://localhost:8787 (der Vite-Proxy erwartet sie dort)
pnpm dev                # App auf http://localhost:5173

pnpm verify             # tsc, oxlint, vitest
pnpm --dir server test  # Tests der API: Konten, Sitzungen, Rate Limits
pnpm e2e                # Playwright, mobiles Viewport (Pixel 7)
pnpm build
```

Ein Konto ist Pflicht, die App startet also auf der Anmeldeseite. Lokal braucht es dafür
**keine** `.env`: ohne `SMTP_HOST` verschickt die API keine E-Mails, sondern schreibt sie samt
Bestätigungslink in ihre eigene Konsole (`server/.env.example` zeigt, was im Betrieb gesetzt
wird). Den Link aus der Konsole aufrufen, und das Konto ist bestätigt.

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

Die erzeugten Lottie-Dateien liegen fertig in `public/anim/` im Repository. Dieser Schritt ist
also nur nötig, wenn die Animationen selbst geändert werden; für Bauen und Ausführen braucht man
die CLI nicht. `tools/anim/sheet.py` braucht zusätzlich Pillow.

## Vor dem öffentlichen Betrieb

- In `src/pages/Legal.tsx` Anschrift und Kontakt-E-Mail eintragen (Platzhalter in eckigen Klammern).

## Lizenz

Dieses Repository ist zum Lesen veröffentlicht, als Arbeitsprobe, und ist keine
Open-Source-Software: ansehen und lokal ausprobieren gern, weiterverwenden nicht. Die Bedingungen
stehen in [LICENSE](LICENSE). Fremde Bestandteile und die Herkunft der Nährwertdaten sind in
[NOTICE.md](NOTICE.md) aufgeführt.

## Deployment

Push auf `main`: GitHub baut und testet auf eigenen Maschinen, inklusive Playwright. Deployt wird von hier aus nichts. Der Hetzner-Server fragt stattdessen alle fünf Minuten nach, in zwei Spuren:

- **Frontend.** Ein grüner Lauf schiebt das fertige `dist` in den Branch `site`. Der Server zieht den Branch mit einem Lesekey und veröffentlicht ihn (`/opt/ci/bin/deploy zyklus --from …`). Die Betreffzeile des Branch-Commits ist der `main`-Commit, aus dem der Build stammt.
- **API.** Der Server liest die Lauf-Liste dieses Repos, nimmt den neuesten grünen `push`-Lauf auf `main` und baut diesen Commit selbst (`deploy zyklus-api <sha>`, Compose).

Der Grund für den Umweg: ein Self-hosted-Runner am Repo wäre in einem öffentlichen Repo eine offene Tür. GitHub führt bei einem Pull Request die Workflow-Datei so aus, wie der Fork sie geschrieben hat, also auch ohne die Absicherungen, die im Original stehen. Ein Timer, der nur liest, lässt sich von außen zu nichts überreden.

Caddy-Block, Projektkonfigurationen und die auf dem Server installierten Skripte liegen als Kopie in `deploy/` und `deploy/host/`.
