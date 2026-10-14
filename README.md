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
- **Ernährung**: Kalorien- und Makroziele (Mifflin-St Jeor), Mahlzeiten, 95 Grundnahrungsmittel offline, Open Food Facts Suche und Barcode-Scanner, Freitext-Eingabe ("150g Hähnchen, 2 Eier"), eigene Lebensmittel, smarte Kalorienanpassung nach Gewichtstrend
- **Fortschritt**: Kalender, Serie, Muskel-Map (Sätze pro Muskel und Woche), 1RM-Verlauf, Bestleistungen, Gewichtstrend, Trainingsverlauf
- **Mobility und Cardio**: 7 geführte Routinen mit Timer, 22 Cardio-Aktivitäten mit MET-basiertem Kalorienverbrauch
- **Urlaubs- und Krankheitsmodus**: Plan und Serie pausieren, leichter Wiedereinstieg
- **PWA**: installierbar, offline nutzbar, Daten bleiben lokal im Browser (Sicherung als JSON)

## Entwicklung

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm verify     # tsc, oxlint, vitest
pnpm build
```

Die Fachlogik liegt in `src/domain/` (ohne React, mit Tests in `src/domain/__tests__/`), die Oberfläche in `src/pages/` und `src/ui/`.

## Deployment

Push auf `main`: GitHub baut und testet, danach veröffentlicht der Self-hosted-Runner auf dem Hetzner-Server mit `/opt/ci/bin/deploy zyklus --from site`. Caddy-Block und Projektkonfiguration liegen als Kopie in `deploy/`.
