import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/kit'

/**
 * Operator details. TODO before going public: replace the bracketed placeholders with the
 * real postal address and contact email (§ 5 DDG requires a summonable address).
 */
const OPERATOR = {
  name: 'Quóc Nam Tràn',
  street: '[Straße und Hausnummer]',
  city: '[PLZ] Leipzig',
  email: '[Kontakt-E-Mail]',
}

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="app">
      <div className="page">
        <div className="row">
          <button className="icon-btn" onClick={() => nav(-1)} aria-label="Zurück">
            <Icon name="back" />
          </button>
        </div>
        <h1>{title}</h1>
        <div className="card stack lg legal">{children}</div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="stack">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

export function Impressum() {
  return (
    <LegalPage title="Impressum">
      <Section title="Angaben gemäß § 5 DDG">
        <p>
          {OPERATOR.name}
          <br />
          {OPERATOR.street}
          <br />
          {OPERATOR.city}
        </p>
      </Section>
      <Section title="Kontakt">
        <p>E-Mail: {OPERATOR.email}</p>
      </Section>
      <Section title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>
          {OPERATOR.name}, Anschrift wie oben
        </p>
      </Section>
      <Section title="Hinweis">
        <p className="small muted">
          Zyklus ist ein privat betriebenes, kostenloses Projekt. Die Inhalte zu Training und Ernährung sind allgemeine Informationen und ersetzen keine ärztliche oder physiotherapeutische Beratung. Zyklus steht in keiner Verbindung zur MCI Solutions GmbH.
        </p>
      </Section>
    </LegalPage>
  )
}

export function Datenschutz() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <p className="small muted">Stand: Oktober 2026</p>
      <Section title="1. Verantwortlicher">
        <p>
          {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city}, E-Mail: {OPERATOR.email}
        </p>
      </Section>
      <Section title="2. Kopie auf deinem Gerät">
        <p>Damit Zyklus auch offline funktioniert, hält die App eine Kopie deiner Daten im Speicher deines Browsers (localStorage). Beim Abmelden kannst du diese Kopie entfernen.</p>
      </Section>
      <Section title="3. Konto und Synchronisierung">
        <p>Für die Nutzung ist ein Konto erforderlich. Dabei verarbeiten wir:</p>
        <ul>
          <li>deine E-Mail-Adresse und einen Hash deines Passworts (das Passwort selbst wird nie gespeichert),</li>
          <li>deine App-Daten: Profil (Alter, Größe, Gewicht, Geschlecht, Ziele), Trainingspläne und Trainingsverlauf, Tagesform-Check-ins, Ernährungseinträge, Supplements, Körpergewicht und Körpermaße,</li>
          <li>technisch notwendige Daten: Sitzungs-Cookie, Zeitpunkt der Anmeldung und den Browser-Kennzeichner (User-Agent) der Sitzung.</li>
        </ul>
        <p>
          Gewicht, Körpermaße, Trainings- und Ernährungsdaten sind Gesundheitsdaten im Sinne von Art. 9 DSGVO. Wir verarbeiten sie nur auf Grundlage deiner ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO), die du bei der Registrierung erteilst. Die übrigen Daten verarbeiten wir zur Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).
        </p>
        <p>Zweck ist allein, dir den Dienst bereitzustellen: Speichern, Synchronisieren zwischen deinen Geräten und Wiederherstellen deiner Daten. Es gibt keine Werbung, kein Tracking und keine Weitergabe an Dritte zu eigenen Zwecken.</p>
      </Section>
      <Section title="4. Cookies und lokaler Speicher">
        <p>Wir setzen ausschließlich ein technisch notwendiges Sitzungs-Cookie (zyk_session, httpOnly, 30 Tage) für die Anmeldung, sowie den localStorage deines Browsers für deine App-Daten. Eine Einwilligung ist dafür nach § 25 Abs. 2 TDDDG nicht erforderlich.</p>
      </Section>
      <Section title="5. Hosting">
        <p>Server und Datenbank betreiben wir auf einem Server der Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, in einem Rechenzentrum in der EU. Mit Hetzner besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO. Beim Aufruf der Seite verarbeitet der Webserver deine IP-Adresse kurzzeitig, um die Verbindung herzustellen und Missbrauch (z. B. massenhafte Anmeldeversuche) zu begrenzen.</p>
      </Section>
      <Section title="6. E-Mail-Versand">
        <p>Bestätigungs- und Passwort-E-Mails versenden wir über den SMTP-Dienst von Google (Gmail), Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Dabei werden deine E-Mail-Adresse und der Inhalt der E-Mail an Google übermittelt. Eine Übermittlung in die USA ist möglich; Google ist nach dem EU-US Data Privacy Framework zertifiziert.</p>
      </Section>
      <Section title="7. Lebensmittel-Datenbank">
        <p>Für die Lebensmittelsuche leiten wir deinen Suchbegriff an Open Food Facts (Open Food Facts, Frankreich) weiter, ohne Bezug zu deiner Person. Beim Scannen eines Barcodes fragt dein Browser die Produktdaten direkt bei Open Food Facts ab; dabei sieht Open Food Facts deine IP-Adresse.</p>
      </Section>
      <Section title="8. Speicherdauer">
        <ul>
          <li>Kontodaten und App-Daten: bis du dein Konto löschst.</li>
          <li>Nicht bestätigte Konten: werden nach 7 Tagen automatisch gelöscht.</li>
          <li>Sitzungen: 30 Tage nach der letzten Nutzung.</li>
          <li>Sicherungskopien der Datenbank: rollierend 14 Tage; gelöschte Konten verschwinden spätestens dann auch aus den Sicherungen.</li>
        </ul>
      </Section>
      <Section title="9. Deine Rechte">
        <p>
          Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO). Deine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Export und Löschung kannst du direkt in der App unter Mehr › Konto ausführen. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, etwa bei der Sächsischen Datenschutz- und Transparenzbeauftragten.
        </p>
      </Section>
      <Section title="10. Sicherheit">
        <p>Die Verbindung ist durchgehend per TLS verschlüsselt. Passwörter werden mit scrypt gehasht, Sitzungs- und Link-Token nur als Hash gespeichert, Anmeldeversuche begrenzt.</p>
      </Section>
    </LegalPage>
  )
}
