import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT, type Lang } from '../i18n'
import { Icon } from '../ui/kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Operator details, identical to the imprint on quocnamtran.com. § 5 DDG wants an address
 * you can be summoned at, so this is the postal one, not a box, and the e-mail is read.
 */
const OPERATOR = {
  name: 'Quóc Nam Tràn',
  street: 'Niedermarkt 35',
  city: '04736 Waldheim',
  email: 'info@quocnamtran.com',
}
const ADDRESS = `${OPERATOR.name}, ${OPERATOR.street}, ${OPERATOR.city}`

/** A section is a title plus paragraphs; an array inside `body` renders as a bullet list. */
type Section = { title: string; body: (string | string[])[] }
type Doc = { title: string; stand?: string; binding?: string; sections: Section[] }

const DOCS: Record<Lang, { impressum: Doc; datenschutz: Doc }> = {
  de: {
    impressum: {
      title: 'Impressum',
      sections: [
        { title: 'Angaben gemäß § 5 DDG', body: [`${OPERATOR.name}\n${OPERATOR.street}\n${OPERATOR.city}`] },
        { title: 'Kontakt', body: [`E-Mail: ${OPERATOR.email}`] },
        { title: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV', body: [`${OPERATOR.name}, Anschrift wie oben`] },
        {
          title: 'Hinweis',
          body: ['Zyklus ist ein privat betriebenes, kostenloses Projekt. Die Inhalte zu Training und Ernährung sind allgemeine Informationen und ersetzen keine ärztliche oder physiotherapeutische Beratung. Zyklus steht in keiner Verbindung zur MCI Solutions GmbH.'],
        },
      ],
    },
    datenschutz: {
      title: 'Datenschutzerklärung',
      stand: 'Stand: November 2026',
      sections: [
        { title: '1. Verantwortlicher', body: [`${ADDRESS}, E-Mail: ${OPERATOR.email}`] },
        { title: '2. Kopie auf deinem Gerät', body: ['Damit Zyklus auch offline funktioniert, hält die App eine Kopie deiner Daten im Speicher deines Browsers (localStorage). Beim Abmelden kannst du diese Kopie entfernen.'] },
        {
          title: '3. Konto und Synchronisierung',
          body: [
            'Für die Nutzung ist ein Konto erforderlich. Dabei verarbeiten wir:',
            [
              'deine E-Mail-Adresse und einen Hash deines Passworts (das Passwort selbst wird nie gespeichert),',
              'deine App-Daten: Profil (Alter, Größe, Gewicht, Geschlecht, Ziele), Trainingspläne und Trainingsverlauf, Tagesform-Check-ins, Ernährungseinträge, Supplements, Körpergewicht und Körpermaße,',
              'technisch notwendige Daten: Sitzungs-Cookie, Zeitpunkt der Anmeldung, die gewählte Sprache und den Browser-Kennzeichner (User-Agent) der Sitzung.',
            ],
            'Gewicht, Körpermaße, Trainings- und Ernährungsdaten sind Gesundheitsdaten im Sinne von Art. 9 DSGVO. Wir verarbeiten sie nur auf Grundlage deiner ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO), die du bei der Registrierung erteilst. Die übrigen Daten verarbeiten wir zur Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
            'Zweck ist allein, dir den Dienst bereitzustellen: Speichern, Synchronisieren zwischen deinen Geräten und Wiederherstellen deiner Daten. Es gibt keine Werbung, kein Tracking und keine Weitergabe an Dritte zu eigenen Zwecken.',
          ],
        },
        {
          title: '4. Freunde und Challenges',
          body: [
            'Wenn du jemanden über deinen Einladungslink oder Code als Freund annimmst oder einer Challenge beitrittst, sehen die anderen einen Auszug: deinen Namen aus dem Profil, deine Tages- und Wochen-Flamme, deine aktiven Tage dieser Woche, deine Erfolgsstufen und deine Beiträge zu gemeinsamen Challenges (aktive Tage oder Minuten). Trainingsinhalte, Gewichte, Ernährung und Körperdaten sehen sie nicht. Dafür speichern wir neben deinen Daten eine daraus berechnete Zusammenfassung deiner Aktivitätstage. Rechtsgrundlage ist die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO), weil du die Funktion selbst nutzt. Freundschaften und Challenges kannst du jederzeit beenden; mit dem Konto werden sie gelöscht.',
            'Zwei Punkte, die du wissen solltest: Wer mit dir befreundet ist, kann dich in eine gemeinsame Challenge aufnehmen, ohne dass du vorher zustimmst. Dein Name und dein Beitrag zu dieser Challenge sind dann auch für die anderen Mitglieder sichtbar, selbst wenn du mit denen nicht befreundet bist. Und wer den Beitritts-Code einer Challenge hat, sieht deren Mitglieder samt Werten, auch schon vor dem Beitritt. Du kannst eine Challenge jederzeit verlassen, dann verschwinden deine Werte dort.',
          ],
        },
        { title: '5. Cookies und lokaler Speicher', body: ['Wir setzen ausschließlich ein technisch notwendiges Sitzungs-Cookie (zyk_session, httpOnly, 30 Tage) für die Anmeldung, sowie den localStorage deines Browsers für deine App-Daten und deine Spracheinstellung. Eine Einwilligung ist dafür nach § 25 Abs. 2 TDDDG nicht erforderlich.'] },
        { title: '6. Hosting', body: ['Server und Datenbank betreiben wir auf einem Server der Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, in einem Rechenzentrum in der EU. Mit Hetzner besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO. Beim Aufruf der Seite verarbeitet der Webserver deine IP-Adresse kurzzeitig, um die Verbindung herzustellen und Missbrauch (z. B. massenhafte Anmeldeversuche) zu begrenzen.'] },
        { title: '7. E-Mail-Versand', body: ['Bestätigungs- und Passwort-E-Mails versenden wir über den SMTP-Dienst von Google (Gmail), Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Dabei werden deine E-Mail-Adresse und der Inhalt der E-Mail an Google übermittelt. Eine Übermittlung in die USA ist möglich; Google ist nach dem EU-US Data Privacy Framework zertifiziert.'] },
        {
          title: '8. Lebensmittel-Datenbank und Barcode-Scanner',
          body: [
            'Für die Lebensmittelsuche leiten wir deinen Suchbegriff an Open Food Facts (Open Food Facts, Frankreich) weiter, ohne Bezug zu deiner Person. Beim Scannen eines Barcodes fragt dein Browser die Produktdaten direkt bei Open Food Facts ab; dabei sieht Open Food Facts deine IP-Adresse.',
            'Für den Scanner fragt die App den Zugriff auf deine Kamera. Das Kamerabild wird ausschließlich auf deinem Gerät ausgewertet, um die Ziffern des Barcodes zu erkennen. Es wird nicht gespeichert, nicht an uns und nicht an Dritte übertragen; nur die erkannte Barcode-Nummer verlässt dein Gerät. Du kannst Lebensmittel jederzeit ohne Kamera suchen oder eintippen.',
          ],
        },
        {
          title: '9. Speicherdauer',
          body: [
            [
              'Kontodaten und App-Daten: bis du dein Konto löschst.',
              'Nicht bestätigte Konten: werden nach 7 Tagen automatisch gelöscht.',
              'Sitzungen: 30 Tage nach der letzten Nutzung.',
              'Sicherungskopien der Datenbank: rollierend 14 Tage; gelöschte Konten verschwinden spätestens dann auch aus den Sicherungen.',
            ],
          ],
        },
        { title: '10. Deine Rechte', body: ['Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO). Deine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Export und Löschung kannst du direkt in der App unter Mehr › Konto ausführen. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, etwa bei der Sächsischen Datenschutz- und Transparenzbeauftragten.'] },
        { title: '11. Sicherheit', body: ['Die Verbindung ist durchgehend per TLS verschlüsselt. Passwörter werden mit scrypt gehasht, Sitzungs- und Link-Token nur als Hash gespeichert, Anmeldeversuche begrenzt.'] },
      ],
    },
  },
  en: {
    impressum: {
      title: 'Legal notice',
      binding: 'This is a translation for your convenience. The German version is legally binding.',
      sections: [
        { title: 'Information according to § 5 DDG (German Digital Services Act)', body: [`${OPERATOR.name}\n${OPERATOR.street}\n${OPERATOR.city}`] },
        { title: 'Contact', body: [`Email: ${OPERATOR.email}`] },
        { title: 'Responsible for content according to § 18 (2) MStV', body: [`${OPERATOR.name}, address as above`] },
        {
          title: 'Note',
          body: ['Zyklus is a privately run, free project. The content on training and nutrition is general information and does not replace medical or physiotherapeutic advice. Zyklus is not affiliated with MCI Solutions GmbH.'],
        },
      ],
    },
    datenschutz: {
      title: 'Privacy policy',
      stand: 'Last updated: November 2026',
      binding: 'This is a translation for your convenience. The German version is legally binding.',
      sections: [
        { title: '1. Controller', body: [`${ADDRESS}, Germany, email: ${OPERATOR.email}`] },
        { title: '2. Copy on your device', body: ['So that Zyklus also works offline, the app keeps a copy of your data in your browser’s storage (localStorage). You can remove this copy when you sign out.'] },
        {
          title: '3. Account and sync',
          body: [
            'An account is required to use the app. We process:',
            [
              'your email address and a hash of your password (the password itself is never stored),',
              'your app data: profile (age, height, weight, sex, goals), training plans and training history, readiness check-ins, food entries, supplements, body weight and body measurements,',
              'technically necessary data: session cookie, time of sign-in, your chosen language and the browser identifier (user agent) of the session.',
            ],
            'Weight, body measurements, training and nutrition data are health data within the meaning of Art. 9 GDPR. We only process them on the basis of your explicit consent (Art. 9 (2) (a) GDPR), which you give when you register. We process the other data to perform the user agreement (Art. 6 (1) (b) GDPR).',
            'The only purpose is to provide the service to you: storing, syncing between your devices and restoring your data. There is no advertising, no tracking and no disclosure to third parties for their own purposes.',
          ],
        },
        {
          title: '4. Friends and challenges',
          body: [
            'When you accept someone as a friend through an invite link or code, or join a challenge, the others see an extract: your profile name, your daily and weekly flame, your active days this week, your achievement levels and your contributions to shared challenges (active days or minutes). They do not see workout contents, weights, nutrition or body data. For this we store a summary of your active days computed from your data. The legal basis is the performance of a contract (Art. 6 (1) (b) GDPR), because you use the feature yourself. You can end friendships and challenges at any time; they are deleted with your account.',
            'Two things worth knowing: anyone who is your friend can add you to a shared challenge without asking you first. Your name and your contribution to that challenge are then visible to the other members too, even to those you are not friends with. And anyone holding a challenge join code can see its members and their values, even before joining. You can leave a challenge at any time, which removes your values from it.',
          ],
        },
        { title: '5. Cookies and local storage', body: ['We only use one technically necessary session cookie (zyk_session, httpOnly, 30 days) for signing in, plus your browser’s localStorage for your app data and language setting. No consent is required for this under § 25 (2) TDDDG.'] },
        { title: '6. Hosting', body: ['We run the server and database on a server of Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Germany, in a data centre in the EU. A data processing agreement under Art. 28 GDPR is in place with Hetzner. When you open the site, the web server briefly processes your IP address to establish the connection and to limit abuse (e.g. mass sign-in attempts).'] },
        { title: '7. Sending emails', body: ['We send confirmation and password emails via Google’s SMTP service (Gmail), Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. Your email address and the content of the email are transmitted to Google. A transfer to the USA is possible; Google is certified under the EU-US Data Privacy Framework.'] },
        {
          title: '8. Food database and barcode scanner',
          body: [
            'For the food search we forward your search term to Open Food Facts (Open Food Facts, France) without any reference to you. When you scan a barcode, your browser requests the product data directly from Open Food Facts; Open Food Facts sees your IP address in the process.',
            'For the scanner the app asks for access to your camera. The camera image is evaluated on your device only, to read the digits of the barcode. It is not stored and never transmitted to us or to anyone else; only the barcode number leaves your device. You can always search or type in a food without the camera.',
          ],
        },
        {
          title: '9. Storage period',
          body: [
            [
              'Account data and app data: until you delete your account.',
              'Unconfirmed accounts: deleted automatically after 7 days.',
              'Sessions: 30 days after the last use.',
              'Database backups: rolling 14 days; deleted accounts disappear from the backups at the latest by then.',
            ],
          ],
        },
        { title: '10. Your rights', body: ['You have the right of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), data portability (Art. 20) and objection (Art. 21 GDPR). You can withdraw your consent at any time with effect for the future. You can export and delete your data directly in the app under More › Account. You can also lodge a complaint with a data protection supervisory authority, for example the Saxon Data Protection and Transparency Commissioner.'] },
        { title: '11. Security', body: ['The connection is encrypted with TLS throughout. Passwords are hashed with scrypt, session and link tokens are only stored as hashes, and sign-in attempts are limited.'] },
      ],
    },
  },
  vi: {
    impressum: {
      title: 'Thông tin pháp lý',
      binding: 'Đây là bản dịch để bạn tiện theo dõi. Bản tiếng Đức có giá trị pháp lý.',
      sections: [
        { title: 'Thông tin theo § 5 DDG (Luật Dịch vụ số của Đức)', body: [`${OPERATOR.name}\n${OPERATOR.street}\n${OPERATOR.city}`] },
        { title: 'Liên hệ', body: [`Email: ${OPERATOR.email}`] },
        { title: 'Chịu trách nhiệm nội dung theo § 18 khoản 2 MStV', body: [`${OPERATOR.name}, địa chỉ như trên`] },
        {
          title: 'Lưu ý',
          body: ['Zyklus là một dự án cá nhân, miễn phí. Nội dung về tập luyện và dinh dưỡng là thông tin chung, không thay thế tư vấn y tế hoặc vật lý trị liệu. Zyklus không liên quan đến MCI Solutions GmbH.'],
        },
      ],
    },
    datenschutz: {
      title: 'Chính sách quyền riêng tư',
      stand: 'Cập nhật: tháng 11/2026',
      binding: 'Đây là bản dịch để bạn tiện theo dõi. Bản tiếng Đức có giá trị pháp lý.',
      sections: [
        { title: '1. Bên chịu trách nhiệm', body: [`${ADDRESS}, Đức, email: ${OPERATOR.email}`] },
        { title: '2. Bản sao trên thiết bị của bạn', body: ['Để Zyklus hoạt động cả khi ngoại tuyến, ứng dụng lưu một bản sao dữ liệu của bạn trong bộ nhớ trình duyệt (localStorage). Khi đăng xuất, bạn có thể xóa bản sao này.'] },
        {
          title: '3. Tài khoản và đồng bộ',
          body: [
            'Bạn cần có tài khoản để sử dụng ứng dụng. Chúng tôi xử lý:',
            [
              'địa chỉ email và giá trị băm (hash) của mật khẩu (bản thân mật khẩu không bao giờ được lưu),',
              'dữ liệu ứng dụng: hồ sơ (tuổi, chiều cao, cân nặng, giới tính, mục tiêu), giáo án và lịch sử tập luyện, đánh giá thể trạng hằng ngày, nhật ký ăn uống, thực phẩm bổ sung, cân nặng và số đo cơ thể,',
              'dữ liệu kỹ thuật cần thiết: cookie phiên đăng nhập, thời điểm đăng nhập, ngôn ngữ bạn chọn và mã nhận diện trình duyệt (user agent) của phiên.',
            ],
            'Cân nặng, số đo cơ thể, dữ liệu tập luyện và dinh dưỡng là dữ liệu sức khỏe theo Điều 9 GDPR. Chúng tôi chỉ xử lý các dữ liệu này dựa trên sự đồng ý rõ ràng của bạn (Điều 9 khoản 2 điểm a GDPR) khi bạn đăng ký. Các dữ liệu còn lại được xử lý để thực hiện thỏa thuận sử dụng (Điều 6 khoản 1 điểm b GDPR).',
            'Mục đích duy nhất là cung cấp dịch vụ cho bạn: lưu trữ, đồng bộ giữa các thiết bị và khôi phục dữ liệu. Không có quảng cáo, không theo dõi và không chia sẻ cho bên thứ ba vì mục đích riêng của họ.',
          ],
        },
        {
          title: '4. Bạn bè và thử thách',
          body: [
            'Khi bạn chấp nhận ai đó làm bạn qua link mời hoặc mã, hoặc tham gia một thử thách, những người khác thấy một phần thông tin: tên trong hồ sơ, lửa ngày và lửa tuần, số ngày vận động trong tuần này, cấp thành tích và phần đóng góp của bạn vào thử thách chung (ngày vận động hoặc số phút). Họ không thấy nội dung buổi tập, mức tạ, dinh dưỡng hay số đo cơ thể. Để làm việc này, chúng tôi lưu một bản tóm tắt các ngày vận động được tính từ dữ liệu của bạn. Cơ sở pháp lý là thực hiện hợp đồng (Điều 6 khoản 1 điểm b GDPR), vì bạn tự sử dụng tính năng này. Bạn có thể kết thúc tình bạn và thử thách bất cứ lúc nào; chúng sẽ bị xóa cùng tài khoản.',
            'Hai điều bạn nên biết: người đã là bạn của bạn có thể thêm bạn vào một thử thách chung mà không hỏi trước. Khi đó tên bạn và phần đóng góp của bạn trong thử thách cũng hiển thị với các thành viên khác, kể cả những người bạn không kết bạn. Ngoài ra, ai có mã tham gia của một thử thách đều thấy danh sách thành viên và số liệu của họ, ngay cả trước khi tham gia. Bạn có thể rời thử thách bất cứ lúc nào, số liệu của bạn ở đó sẽ biến mất.',
          ],
        },
        { title: '5. Cookie và bộ nhớ cục bộ', body: ['Chúng tôi chỉ dùng một cookie phiên cần thiết về mặt kỹ thuật (zyk_session, httpOnly, 30 ngày) để đăng nhập, cùng với localStorage của trình duyệt cho dữ liệu ứng dụng và cài đặt ngôn ngữ. Theo § 25 khoản 2 TDDDG, việc này không cần sự đồng ý.'] },
        { title: '6. Lưu trữ máy chủ', body: ['Máy chủ và cơ sở dữ liệu được vận hành trên máy chủ của Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Đức, tại trung tâm dữ liệu trong EU. Chúng tôi có hợp đồng xử lý dữ liệu theo Điều 28 GDPR với Hetzner. Khi bạn truy cập trang, máy chủ web xử lý địa chỉ IP của bạn trong thời gian ngắn để thiết lập kết nối và hạn chế lạm dụng (ví dụ: đăng nhập hàng loạt).'] },
        { title: '7. Gửi email', body: ['Email xác nhận và email mật khẩu được gửi qua dịch vụ SMTP của Google (Gmail), Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. Địa chỉ email và nội dung email của bạn được chuyển đến Google. Dữ liệu có thể được chuyển sang Hoa Kỳ; Google được chứng nhận theo Khung bảo mật dữ liệu EU - Hoa Kỳ (Data Privacy Framework).'] },
        {
          title: '8. Cơ sở dữ liệu thực phẩm và máy quét mã vạch',
          body: [
            'Khi tìm kiếm thực phẩm, chúng tôi chuyển từ khóa tìm kiếm đến Open Food Facts (Open Food Facts, Pháp) mà không kèm thông tin về bạn. Khi quét mã vạch, trình duyệt của bạn truy vấn dữ liệu sản phẩm trực tiếp từ Open Food Facts; khi đó Open Food Facts thấy địa chỉ IP của bạn.',
            'Để quét mã, ứng dụng xin quyền truy cập camera của bạn. Hình ảnh camera chỉ được xử lý ngay trên thiết bị của bạn để đọc các chữ số của mã vạch. Hình ảnh không được lưu lại và không được truyền đến chúng tôi hay bất kỳ bên thứ ba nào; chỉ số mã vạch đã nhận dạng rời khỏi thiết bị. Bạn luôn có thể tìm hoặc tự nhập thực phẩm mà không cần camera.',
          ],
        },
        {
          title: '9. Thời hạn lưu trữ',
          body: [
            [
              'Dữ liệu tài khoản và dữ liệu ứng dụng: cho đến khi bạn xóa tài khoản.',
              'Tài khoản chưa xác nhận: tự động xóa sau 7 ngày.',
              'Phiên đăng nhập: 30 ngày sau lần sử dụng cuối.',
              'Bản sao lưu cơ sở dữ liệu: luân phiên 14 ngày; tài khoản đã xóa cũng biến mất khỏi bản sao lưu chậm nhất sau thời gian này.',
            ],
          ],
        },
        { title: '10. Quyền của bạn', body: ['Bạn có quyền được biết (Điều 15), chỉnh sửa (Điều 16), xóa (Điều 17), hạn chế xử lý (Điều 18), chuyển dữ liệu (Điều 20) và phản đối (Điều 21 GDPR). Bạn có thể rút lại sự đồng ý bất cứ lúc nào, có hiệu lực cho tương lai. Bạn có thể xuất và xóa dữ liệu trực tiếp trong ứng dụng tại Thêm › Tài khoản. Bạn cũng có thể khiếu nại với cơ quan giám sát bảo vệ dữ liệu, ví dụ Ủy viên Bảo vệ Dữ liệu và Minh bạch bang Sachsen (Đức).'] },
        { title: '11. Bảo mật', body: ['Kết nối luôn được mã hóa bằng TLS. Mật khẩu được băm bằng scrypt, token phiên và token đường dẫn chỉ được lưu dưới dạng băm, số lần đăng nhập được giới hạn.'] },
      ],
    },
  },
}

function LegalPage({ doc }: { doc: Doc }) {
  const nav = useNavigate()
  const { t } = useT()
  return (
    <div className="mx-auto min-h-dvh max-w-[560px]">
      <div className="page">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => nav(-1)} aria-label={t('common.back')}>
            <Icon name="back" />
          </Button>
        </div>
        <h1>{doc.title}</h1>
        {doc.binding && (
          <p className="text-[0.85rem]" style={{ background: 'var(--warn-soft)', padding: '10px 12px', borderRadius: 10 }}>
            {doc.binding}
          </p>
        )}
        <Card className="flex flex-col gap-4 legal">
          {doc.stand && <p className="text-[0.85rem] text-muted-foreground">{doc.stand}</p>}
          {doc.sections.map((s) => (
            <section key={s.title} className="flex flex-col gap-2">
              <h3>{s.title}</h3>
              {s.body.map((b, i): ReactNode =>
                Array.isArray(b) ? (
                  <ul key={i}>
                    {b.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} style={{ whiteSpace: 'pre-line' }}>
                    {b}
                  </p>
                ),
              )}
            </section>
          ))}
        </Card>
      </div>
    </div>
  )
}

export function Impressum() {
  const { lang } = useT()
  return <LegalPage doc={DOCS[lang].impressum} />
}

export function Datenschutz() {
  const { lang } = useT()
  return <LegalPage doc={DOCS[lang].datenschutz} />
}
