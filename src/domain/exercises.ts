import type { Equipment, Exercise, Level, Muscle, Slot } from './types'

type Opts = Partial<Pick<Exercise, 'loadType' | 'compound' | 'increment' | 'minLevel'>>

function ex(
  id: string,
  name: string,
  slot: Slot,
  primary: Muscle,
  secondary: Muscle[],
  equipment: Equipment[],
  cues: string[],
  opts: Opts = {},
): Exercise {
  const compound = opts.compound ?? false
  return {
    id,
    name,
    slot,
    primary,
    secondary,
    equipment,
    cues,
    loadType: opts.loadType ?? 'gewicht',
    compound,
    increment: opts.increment ?? (compound ? 2.5 : 1),
    minLevel: opts.minLevel ?? 'anfaenger',
  }
}

const C = { compound: true }
const BW = { loadType: 'koerpergewicht' as const, increment: 0 }
const BWC = { ...BW, compound: true }

/**
 * Order inside a slot is the preference order for plan generation:
 * the first exercise whose equipment is available gets picked.
 */
export const EXERCISES: Exercise[] = [
  // Brust
  ex('bankdruecken-lh', 'Bankdrücken (Langhantel)', 'brust_compound', 'brust', ['trizeps', 'schultern'], ['langhantel', 'bank'], ['Schulterblätter zusammen und nach unten ziehen', 'Stange kontrolliert zur unteren Brust senken', 'Füße fest am Boden, leichter Bogen im oberen Rücken'], C),
  ex('bankdruecken-kh', 'Bankdrücken (Kurzhantel)', 'brust_compound', 'brust', ['trizeps', 'schultern'], ['kurzhantel', 'bank'], ['Ellbogen etwa 45° vom Körper', 'Unten tiefe Dehnung, oben nicht zusammenschlagen', 'Handgelenke über den Ellbogen'], { ...C, increment: 2 }),
  ex('brustpresse', 'Brustpresse (Maschine)', 'brust_compound', 'brust', ['trizeps', 'schultern'], ['maschine'], ['Sitz so einstellen, dass Griffe auf Brusthöhe sind', 'Schulterblätter an der Lehne lassen', 'Langsam zurück bis zur Dehnung'], C),
  ex('dips-brust', 'Dips (Brustfokus)', 'brust_compound', 'brust', ['trizeps', 'schultern'], ['dipbarren'], ['Oberkörper leicht nach vorn neigen', 'Bis Oberarme parallel zum Boden absenken', 'Schultern weg von den Ohren'], { ...BWC, minLevel: 'fortgeschritten' }),
  ex('liegestuetze', 'Liegestütze', 'brust_compound', 'brust', ['trizeps', 'schultern', 'bauch'], ['koerpergewicht'], ['Körper bildet eine Linie von Kopf bis Ferse', 'Brust bis kurz über den Boden', 'Hände etwas breiter als schulterbreit'], BWC),

  ex('schraegbank-lh', 'Schrägbankdrücken (Langhantel)', 'brust_schraeg', 'brust', ['schultern', 'trizeps'], ['langhantel', 'bank'], ['Bank auf 30° einstellen', 'Stange zur oberen Brust senken', 'Schulterblätter fixiert lassen'], C),
  ex('schraegbank-kh', 'Schrägbankdrücken (Kurzhantel)', 'brust_schraeg', 'brust', ['schultern', 'trizeps'], ['kurzhantel', 'bank'], ['Bank auf 30° einstellen', 'Hanteln seitlich der oberen Brust absenken', 'Oben leicht zueinander führen'], { ...C, increment: 2 }),
  ex('schraegbank-maschine', 'Schrägbank-Brustpresse (Maschine)', 'brust_schraeg', 'brust', ['schultern', 'trizeps'], ['maschine'], ['Griffe auf Höhe der oberen Brust', 'Brust raus, Schultern unten', 'Kontrolliert zurück'], C),
  ex('liegestuetze-erhoeht', 'Liegestütze mit erhöhten Füßen', 'brust_schraeg', 'brust', ['schultern', 'trizeps'], ['koerpergewicht'], ['Füße auf Stuhl oder Bank', 'Rumpf fest, kein Hohlkreuz', 'Kopf in Verlängerung der Wirbelsäule'], BWC),

  ex('kabel-fliegende', 'Fliegende am Kabelzug', 'brust_iso', 'brust', [], ['kabel'], ['Leicht gebeugte, fixierte Ellbogen', 'Hände in einem Bogen vor der Brust zusammenführen', 'Langsam bis zur Dehnung öffnen']),
  ex('butterfly', 'Butterfly (Maschine)', 'brust_iso', 'brust', [], ['maschine'], ['Griffe auf Brusthöhe', 'Ellbogen leicht gebeugt', 'Kurz halten in der Kontraktion']),
  ex('kh-fliegende', 'Fliegende (Kurzhantel)', 'brust_iso', 'brust', [], ['kurzhantel', 'bank'], ['Arme leicht gebeugt fixieren', 'Nur so tief, wie die Schulter es angenehm zulässt', 'Bewegung aus dem Schultergelenk']),
  ex('band-fliegende', 'Fliegende mit Band', 'brust_iso', 'brust', [], ['baender'], ['Band hinter dir befestigen', 'Arme bogenförmig nach vorn', 'Kontrolliert zurück']),

  // Rücken
  ex('klimmzuege', 'Klimmzüge', 'ruecken_vertikal', 'ruecken', ['bizeps', 'unterarme'], ['klimmzugstange'], ['Aus dem toten Hang starten', 'Brust zur Stange, Schulterblätter nach unten', 'Kein Schwung'], { ...BWC, minLevel: 'fortgeschritten' }),
  ex('latzug', 'Latzug (Kabel)', 'ruecken_vertikal', 'ruecken', ['bizeps'], ['kabel'], ['Stange zur oberen Brust ziehen', 'Oberkörper nur leicht zurückneigen', 'Oben volle Streckung'], C),
  ex('latzug-eng', 'Latzug eng (Neutralgriff)', 'ruecken_vertikal', 'ruecken', ['bizeps'], ['kabel'], ['Ellbogen eng am Körper nach unten führen', 'Brust zum Griff', 'Kontrolliert nach oben'], C),
  ex('klimmzug-assistiert', 'Klimmzüge assistiert (Maschine)', 'ruecken_vertikal', 'ruecken', ['bizeps'], ['maschine'], ['Mehr Gegengewicht = leichter', 'Brust zur Stange', 'Unten vollständig strecken'], C),
  ex('band-latzug', 'Latzug mit Band', 'ruecken_vertikal', 'ruecken', ['bizeps'], ['baender'], ['Band hoch befestigen', 'Ellbogen nach unten zu den Hüften', 'Schulterblätter aktiv'], C),
  ex('klimmzug-negativ', 'Negative Klimmzüge', 'ruecken_vertikal', 'ruecken', ['bizeps'], ['klimmzugstange'], ['Oben starten (mit Sprung oder Stuhl)', 'In 3 bis 5 Sekunden absenken', 'Unten kontrolliert ankommen'], BWC),

  ex('rudern-lh', 'Langhantelrudern', 'ruecken_horizontal', 'ruecken', ['bizeps', 'schultern'], ['langhantel'], ['Oberkörper etwa 45° vorgebeugt, Rücken gerade', 'Stange zum Bauchnabel ziehen', 'Kein Schwung aus der Hüfte'], { ...C, minLevel: 'fortgeschritten' }),
  ex('kabelrudern', 'Rudern am Kabel (sitzend)', 'ruecken_horizontal', 'ruecken', ['bizeps'], ['kabel'], ['Brust raus, Rücken neutral', 'Griff zum Bauch ziehen', 'Schulterblätter zusammen, dann lang werden lassen'], C),
  ex('rudermaschine', 'Rudern brustgestützt (Maschine)', 'ruecken_horizontal', 'ruecken', ['bizeps'], ['maschine'], ['Brust fest am Polster', 'Ellbogen nach hinten ziehen', 'Langsam nach vorn strecken'], C),
  ex('kh-rudern', 'Einarmiges Kurzhantelrudern', 'ruecken_horizontal', 'ruecken', ['bizeps'], ['kurzhantel', 'bank'], ['Knie und Hand auf der Bank abstützen', 'Hantel Richtung Hüfte ziehen', 'Rumpf nicht verdrehen'], { ...C, increment: 2 }),
  ex('kh-rudern-schraeg', 'Brustgestütztes Kurzhantelrudern', 'ruecken_horizontal', 'ruecken', ['bizeps', 'schultern'], ['kurzhantel', 'bank'], ['Bauchlage auf Schrägbank', 'Ellbogen nach hinten oben', 'Kurz halten'], { ...C, increment: 2 }),
  ex('band-rudern', 'Rudern mit Band', 'ruecken_horizontal', 'ruecken', ['bizeps'], ['baender'], ['Band auf Brusthöhe befestigen', 'Ellbogen eng nach hinten', 'Schulterblätter zusammendrücken'], C),
  ex('umgekehrtes-rudern', 'Umgekehrtes Rudern (Tisch oder Stange)', 'ruecken_horizontal', 'ruecken', ['bizeps'], ['koerpergewicht'], ['Unter einem stabilen Tisch liegen', 'Brust zur Kante ziehen', 'Körper bleibt gerade'], BWC),

  // Schultern
  ex('schulterdruecken-kh', 'Schulterdrücken (Kurzhantel, sitzend)', 'schulter_press', 'schultern', ['trizeps'], ['kurzhantel', 'bank'], ['Lehne steil einstellen', 'Hanteln bis Kinnhöhe senken', 'Nicht ins Hohlkreuz fallen'], { ...C, increment: 2 }),
  ex('military-press', 'Schulterdrücken stehend (Langhantel)', 'schulter_press', 'schultern', ['trizeps', 'bauch'], ['langhantel'], ['Gesäß und Bauch anspannen', 'Stange nah am Gesicht vorbei', 'Oben Kopf durch die Arme'], { ...C, minLevel: 'fortgeschritten' }),
  ex('schulterpresse', 'Schulterpresse (Maschine)', 'schulter_press', 'schultern', ['trizeps'], ['maschine'], ['Griffe auf Schulterhöhe', 'Rücken an der Lehne', 'Oben nicht durchstrecken'], C),
  ex('kb-schulterdruecken', 'Schulterdrücken (Kettlebell)', 'schulter_press', 'schultern', ['trizeps', 'bauch'], ['kettlebell'], ['Kettlebell in Racked-Position', 'Gerade nach oben drücken', 'Rumpf stabil'], { ...C, increment: 4 }),
  ex('band-schulterdruecken', 'Schulterdrücken mit Band', 'schulter_press', 'schultern', ['trizeps'], ['baender'], ['Auf dem Band stehen', 'Griffe von Schulterhöhe nach oben drücken', 'Kontrolliert zurück'], C),
  ex('pike-liegestuetze', 'Pike-Liegestütze', 'schulter_press', 'schultern', ['trizeps'], ['koerpergewicht'], ['Hüfte hoch, umgedrehtes V', 'Kopf Richtung Boden zwischen die Hände', 'Ellbogen nach hinten'], BWC),

  ex('seitheben-kh', 'Seitheben (Kurzhantel)', 'seitheben', 'schultern', [], ['kurzhantel'], ['Ellbogen leicht gebeugt', 'Bis Schulterhöhe heben', 'Kein Schwung, langsam absenken']),
  ex('seitheben-kabel', 'Seitheben am Kabel', 'seitheben', 'schultern', [], ['kabel'], ['Kabel von unten, vor dem Körper', 'Arm seitlich bis Schulterhöhe', 'Spannung unten halten']),
  ex('seitheben-maschine', 'Seitheben (Maschine)', 'seitheben', 'schultern', [], ['maschine'], ['Polster an den Oberarmen', 'Bis Schulterhöhe', 'Langsam ablassen']),
  ex('seitheben-band', 'Seitheben mit Band', 'seitheben', 'schultern', [], ['baender'], ['Auf dem Band stehen', 'Seitlich bis Schulterhöhe', 'Langsam zurück']),

  ex('reverse-butterfly', 'Reverse Butterfly (Maschine)', 'hintere_schulter', 'schultern', ['ruecken'], ['maschine'], ['Brust ans Polster', 'Arme weit nach hinten öffnen', 'Schultern unten lassen']),
  ex('face-pulls', 'Face Pulls (Kabel)', 'hintere_schulter', 'schultern', ['ruecken'], ['kabel'], ['Seil auf Augenhöhe', 'Zum Gesicht ziehen, Ellbogen hoch', 'Außenrotation am Ende']),
  ex('vorgebeugtes-seitheben', 'Vorgebeugtes Seitheben (Kurzhantel)', 'hintere_schulter', 'schultern', ['ruecken'], ['kurzhantel'], ['Oberkörper fast parallel zum Boden', 'Arme seitlich heben', 'Nicht mit dem Rücken schwingen']),
  ex('band-pull-apart', 'Band Pull-Aparts', 'hintere_schulter', 'schultern', ['ruecken'], ['baender'], ['Arme gestreckt vor der Brust', 'Band auseinanderziehen bis zur Brust', 'Schulterblätter zusammen']),

  // Arme
  ex('kh-curls', 'Bizepscurls (Kurzhantel)', 'bizeps', 'bizeps', ['unterarme'], ['kurzhantel'], ['Ellbogen bleiben am Körper', 'Handflächen oben drehen (supinieren)', 'Langsam absenken']),
  ex('lh-curls', 'Bizepscurls (Langhantel)', 'bizeps', 'bizeps', ['unterarme'], ['langhantel'], ['Schulterbreiter Griff', 'Kein Schwung aus dem Rücken', 'Volle Streckung unten'], { increment: 2.5 }),
  ex('kabel-curls', 'Bizepscurls am Kabel', 'bizeps', 'bizeps', ['unterarme'], ['kabel'], ['Konstante Spannung', 'Ellbogen fixiert', 'Oben kurz halten']),
  ex('schraegbank-curls', 'Schrägbank-Curls (Kurzhantel)', 'bizeps', 'bizeps', [], ['kurzhantel', 'bank'], ['Bank auf 45 bis 60°', 'Arme hängen hinter dem Körper', 'Dehnung unten nutzen'], { minLevel: 'fortgeschritten' }),
  ex('hammer-curls', 'Hammer-Curls', 'bizeps', 'bizeps', ['unterarme'], ['kurzhantel'], ['Neutraler Griff (Daumen oben)', 'Ellbogen ruhig', 'Kontrolliert ablassen']),
  ex('bizepsmaschine', 'Bizepsmaschine', 'bizeps', 'bizeps', [], ['maschine'], ['Oberarme flach auf dem Polster', 'Volle Bewegung', 'Langsam zurück']),
  ex('band-curls', 'Bizepscurls mit Band', 'bizeps', 'bizeps', [], ['baender'], ['Auf dem Band stehen', 'Ellbogen am Körper', 'Oben anspannen']),

  ex('pushdown', 'Trizepsdrücken am Kabel', 'trizeps', 'trizeps', [], ['kabel'], ['Ellbogen eng am Körper', 'Vollständig strecken', 'Nur der Unterarm bewegt sich']),
  ex('ueberkopf-kabel', 'Überkopf-Trizepsstrecken (Kabel)', 'trizeps', 'trizeps', [], ['kabel'], ['Rücken zum Kabel, Seil über dem Kopf', 'Ellbogen zeigen nach vorn', 'Tiefe Dehnung hinter dem Kopf']),
  ex('stirndruecken', 'Stirndrücken (SZ- oder Langhantel)', 'trizeps', 'trizeps', [], ['langhantel', 'bank'], ['Oberarme senkrecht halten', 'Stange Richtung Stirn oder hinter den Kopf', 'Ellbogen nicht ausstellen'], { increment: 2.5 }),
  ex('kh-ueberkopf', 'Überkopf-Trizepsstrecken (Kurzhantel)', 'trizeps', 'trizeps', [], ['kurzhantel'], ['Hantel mit beiden Händen über dem Kopf', 'Hinter dem Kopf absenken', 'Ellbogen eng']),
  ex('dips-trizeps', 'Dips (Trizepsfokus)', 'trizeps', 'trizeps', ['brust', 'schultern'], ['dipbarren'], ['Oberkörper aufrecht', 'Ellbogen nach hinten', 'Oben voll strecken'], { ...BWC, minLevel: 'fortgeschritten' }),
  ex('bankdips', 'Bankdips', 'trizeps', 'trizeps', ['schultern'], ['koerpergewicht'], ['Hände hinter dir auf Stuhl oder Bank', 'Ellbogen nach hinten beugen', 'Schultern weg von den Ohren'], BW),
  ex('band-pushdown', 'Trizepsdrücken mit Band', 'trizeps', 'trizeps', [], ['baender'], ['Band hoch befestigen', 'Ellbogen am Körper', 'Unten voll strecken']),
  ex('enge-liegestuetze', 'Enge Liegestütze', 'trizeps', 'trizeps', ['brust'], ['koerpergewicht'], ['Hände unter den Schultern', 'Ellbogen eng am Körper', 'Körper gerade'], BW),

  // Beine
  ex('kniebeuge-lh', 'Kniebeuge (Langhantel)', 'kniebeuge', 'quadrizeps', ['gesaess', 'bauch'], ['langhantel'], ['Stange auf dem oberen Rücken', 'Knie folgen den Fußspitzen', 'Mindestens bis Oberschenkel parallel'], { ...C, minLevel: 'fortgeschritten' }),
  ex('beinpresse', 'Beinpresse', 'kniebeuge', 'quadrizeps', ['gesaess'], ['maschine'], ['Füße schulterbreit mittig', 'Tief absenken, Gesäß bleibt am Polster', 'Knie oben nicht durchdrücken'], { ...C, increment: 5 }),
  ex('hackenschmidt', 'Hackenschmidt-Kniebeuge', 'kniebeuge', 'quadrizeps', ['gesaess'], ['maschine'], ['Rücken fest am Polster', 'Tief in die Hocke', 'Über den ganzen Fuß drücken'], { ...C, increment: 5 }),
  ex('goblet-squat', 'Goblet Squat (Kurzhantel)', 'kniebeuge', 'quadrizeps', ['gesaess', 'bauch'], ['kurzhantel'], ['Hantel vor der Brust halten', 'Ellbogen zwischen die Knie', 'Oberkörper aufrecht'], { ...C, increment: 2 }),
  ex('goblet-squat-kb', 'Goblet Squat (Kettlebell)', 'kniebeuge', 'quadrizeps', ['gesaess', 'bauch'], ['kettlebell'], ['Kettlebell an den Hörnern halten', 'Tief sitzen', 'Knie nach außen'], { ...C, increment: 4 }),
  ex('kniebeuge-kg', 'Kniebeuge (Körpergewicht)', 'kniebeuge', 'quadrizeps', ['gesaess'], ['koerpergewicht'], ['Arme nach vorn als Gegengewicht', 'Langsam runter (3 Sekunden)', 'Fersen bleiben am Boden'], BWC),

  ex('rdl-lh', 'Rumänisches Kreuzheben (Langhantel)', 'hinge', 'beinbeuger', ['gesaess', 'ruecken'], ['langhantel'], ['Hüfte nach hinten schieben', 'Stange nah an den Beinen', 'Rücken neutral, Dehnung in den Beinbeugern'], C),
  ex('kreuzheben', 'Kreuzheben (Langhantel)', 'hinge', 'gesaess', ['beinbeuger', 'ruecken', 'unterarme'], ['langhantel'], ['Stange über der Fußmitte', 'Rücken neutral, Brust raus', 'Aus den Beinen drücken, Hüfte strecken'], { ...C, minLevel: 'fortgeschritten', increment: 5 }),
  ex('rdl-kh', 'Rumänisches Kreuzheben (Kurzhantel)', 'hinge', 'beinbeuger', ['gesaess', 'ruecken'], ['kurzhantel'], ['Hanteln an den Oberschenkeln entlang', 'Knie leicht gebeugt', 'Hüfte nach hinten'], { ...C, increment: 2 }),
  ex('hip-thrust', 'Hip Thrust (Langhantel)', 'hinge', 'gesaess', ['beinbeuger'], ['langhantel', 'bank'], ['Oberer Rücken auf der Bank', 'Kinn zur Brust', 'Oben Gesäß fest anspannen'], { ...C, increment: 5 }),
  ex('kb-swing', 'Kettlebell Swings', 'hinge', 'gesaess', ['beinbeuger', 'ruecken'], ['kettlebell'], ['Explosive Hüftstreckung', 'Arme sind nur Seile', 'Rücken neutral'], { ...C, increment: 4 }),
  ex('einbeinige-bruecke', 'Einbeinige Glute Bridge', 'hinge', 'gesaess', ['beinbeuger'], ['koerpergewicht'], ['Ein Fuß aufgestellt, anderes Bein gestreckt', 'Hüfte hoch bis zur Linie', 'Oben 1 Sekunde halten'], BWC),

  ex('bulgarian-kh', 'Bulgarische Split Squats (Kurzhantel)', 'unilateral_bein', 'quadrizeps', ['gesaess'], ['kurzhantel', 'bank'], ['Hinterer Fuß auf der Bank', 'Senkrecht nach unten sinken', 'Vorderes Knie stabil'], { ...C, increment: 2 }),
  ex('ausfallschritte-kh', 'Ausfallschritte (Kurzhantel)', 'unilateral_bein', 'quadrizeps', ['gesaess'], ['kurzhantel'], ['Großer Schritt nach vorn', 'Hinteres Knie fast zum Boden', 'Oberkörper aufrecht'], { ...C, increment: 2 }),
  ex('step-ups', 'Step-ups (Kurzhantel)', 'unilateral_bein', 'quadrizeps', ['gesaess'], ['kurzhantel', 'bank'], ['Ganzer Fuß auf der Box', 'Über das vordere Bein hochdrücken', 'Langsam absteigen'], { ...C, increment: 2 }),
  ex('bulgarian-kg', 'Bulgarische Split Squats (Körpergewicht)', 'unilateral_bein', 'quadrizeps', ['gesaess'], ['koerpergewicht'], ['Hinterer Fuß auf Stuhl oder Sofa', 'Langsam absenken', 'Druck über die vordere Ferse'], BWC),
  ex('ausfallschritte-kg', 'Ausfallschritte rückwärts', 'unilateral_bein', 'quadrizeps', ['gesaess'], ['koerpergewicht'], ['Schritt nach hinten', 'Hinteres Knie Richtung Boden', 'Über die vordere Ferse zurück'], BWC),

  ex('beinstrecker', 'Beinstrecker (Maschine)', 'quad_iso', 'quadrizeps', [], ['maschine'], ['Knie auf Höhe der Drehachse', 'Oben 1 Sekunde halten', 'Langsam ablassen'], { increment: 2.5 }),
  ex('sissy-squat', 'Sissy Squat (unterstützt)', 'quad_iso', 'quadrizeps', [], ['koerpergewicht'], ['An einer Tür oder Stange festhalten', 'Knie nach vorn, Körper nach hinten lehnen', 'Nur so tief, wie es die Knie zulassen'], { ...BW, minLevel: 'fortgeschritten' }),
  ex('spanish-squat', 'Spanish Squat (Band)', 'quad_iso', 'quadrizeps', [], ['baender'], ['Band hinter den Knien befestigen', 'Nach hinten lehnen und tief sitzen', 'Schienbeine senkrecht']),

  ex('beinbeuger-liegend', 'Beinbeuger liegend (Maschine)', 'beinbeuger_iso', 'beinbeuger', [], ['maschine'], ['Hüfte am Polster lassen', 'Fersen zum Gesäß', 'Langsam strecken'], { increment: 2.5 }),
  ex('beinbeuger-sitzend', 'Beinbeuger sitzend (Maschine)', 'beinbeuger_iso', 'beinbeuger', [], ['maschine'], ['Oberkörper leicht nach vorn', 'Volle Bewegung', 'Unten kontrolliert'], { increment: 2.5 }),
  ex('nordic-curls', 'Nordic Curls', 'beinbeuger_iso', 'beinbeuger', [], ['koerpergewicht'], ['Füße fixieren (Sofa, Partner)', 'Langsam nach vorn fallen lassen', 'Mit den Händen abfangen'], { ...BW, minLevel: 'fortgeschritten' }),
  ex('slider-curls', 'Beinbeuger mit Handtuch (Slider)', 'beinbeuger_iso', 'beinbeuger', ['gesaess'], ['koerpergewicht'], ['Rückenlage, Fersen auf Handtuch', 'Hüfte hoch halten', 'Fersen heranziehen und wieder strecken'], BW),
  ex('band-beinbeuger', 'Beinbeuger mit Band', 'beinbeuger_iso', 'beinbeuger', [], ['baender'], ['Bauchlage, Band um die Knöchel', 'Fersen zum Gesäß', 'Langsam zurück']),

  ex('abduktoren', 'Abduktorenmaschine', 'gesaess_iso', 'gesaess', [], ['maschine'], ['Oberkörper leicht nach vorn für mehr Gesäß', 'Knie nach außen drücken', 'Langsam zurück'], { increment: 2.5 }),
  ex('kabel-kickback', 'Kickbacks am Kabel', 'gesaess_iso', 'gesaess', [], ['kabel'], ['Manschette am Knöchel', 'Bein nach hinten oben', 'Kein Hohlkreuz']),
  ex('band-abduktion', 'Abduktion mit Band (Clamshell)', 'gesaess_iso', 'gesaess', [], ['baender'], ['Seitlage, Band über den Knien', 'Oberes Knie öffnen', 'Hüfte nicht nach hinten kippen']),

  ex('wadenheben-stehend', 'Wadenheben stehend (Maschine)', 'waden', 'waden', [], ['maschine'], ['Unten tief dehnen, kurz halten', 'Auf die Fußballen hochdrücken', 'Oben 1 Sekunde halten'], { increment: 5 }),
  ex('wadenheben-sitzend', 'Wadenheben sitzend (Maschine)', 'waden', 'waden', [], ['maschine'], ['Polster auf den Knien', 'Volle Bewegung', 'Pause unten'], { increment: 5 }),
  ex('wadenheben-kh', 'Wadenheben einbeinig (Kurzhantel)', 'waden', 'waden', [], ['kurzhantel'], ['Auf einer Stufe stehen', 'Tief absenken', 'Langsam hoch'], { increment: 2 }),
  ex('wadenheben-kg', 'Wadenheben einbeinig (Stufe)', 'waden', 'waden', [], ['koerpergewicht'], ['Auf einer Treppenstufe stehen', 'Ferse tief unter die Stufe', 'Oben halten'], BW),

  // Bauch
  ex('cable-crunch', 'Kabel-Crunch', 'bauch', 'bauch', [], ['kabel'], ['Kniend, Seil am Kopf', 'Brustbein Richtung Becken einrollen', 'Hüfte bleibt ruhig']),
  ex('beinheben-haengend', 'Hängendes Beinheben', 'bauch', 'bauch', ['unterarme'], ['klimmzugstange'], ['Becken einrollen, nicht nur Beine heben', 'Kein Schwung', 'Langsam ablassen'], { ...BW, minLevel: 'fortgeschritten' }),
  ex('pallof-press', 'Pallof Press', 'bauch', 'bauch', [], ['baender'], ['Seitlich zum Band stehen', 'Arme gerade nach vorn drücken', 'Rumpf nicht verdrehen lassen']),
  ex('crunches', 'Crunches', 'bauch', 'bauch', [], ['koerpergewicht'], ['Lendenwirbel am Boden', 'Schultern einrollen', 'Ausatmen beim Hochkommen'], BW),
  ex('dead-bug', 'Dead Bug', 'bauch', 'bauch', [], ['koerpergewicht'], ['Lendenwirbel an den Boden drücken', 'Gegengleich Arm und Bein strecken', 'Langsam und kontrolliert'], BW),
  ex('beinheben-liegend', 'Beinheben liegend', 'bauch', 'bauch', [], ['koerpergewicht'], ['Hände unter das Gesäß', 'Beine gestreckt heben', 'Unten nicht ablegen'], BW),

  // Unterarme / Griffkraft
  ex('handgelenkcurls', 'Handgelenkcurls (Kurzhantel)', 'unterarme', 'unterarme', [], ['kurzhantel', 'bank'], ['Unterarme auf der Bank', 'Nur das Handgelenk bewegt sich', 'Volle Bewegung']),
  ex('farmers-walk-reps', 'Farmer Holds (Kurzhantel, Sekunden als Wdh.)', 'unterarme', 'unterarme', ['schultern'], ['kurzhantel'], ['Schwere Hanteln seitlich halten', 'Schultern unten, aufrecht', 'Jede Wiederholung = 5 Sekunden halten'], { increment: 2 }),
  ex('toter-hang', 'Toter Hang (Sekunden als Wdh.)', 'unterarme', 'unterarme', ['ruecken'], ['klimmzugstange'], ['Locker an der Stange hängen', 'Schultern leicht aktiv', 'Jede Wiederholung = 5 Sekunden'], BW),
]

const LEVEL_RANK: Record<Level, number> = { anfaenger: 0, fortgeschritten: 1, profi: 2 }

export function levelAllows(user: Level, required: Level): boolean {
  return LEVEL_RANK[user] >= LEVEL_RANK[required]
}

export function hasEquipment(available: Equipment[], ex: Exercise): boolean {
  return ex.equipment.every((e) => e === 'koerpergewicht' || available.includes(e))
}

export const MUSCLE_LABEL: Record<Muscle, string> = {
  brust: 'Brust',
  ruecken: 'Rücken',
  schultern: 'Schultern',
  bizeps: 'Bizeps',
  trizeps: 'Trizeps',
  quadrizeps: 'Quadrizeps',
  beinbeuger: 'Beinbeuger',
  gesaess: 'Gesäß',
  waden: 'Waden',
  bauch: 'Bauch',
  unterarme: 'Unterarme',
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  langhantel: 'Langhantel',
  kurzhantel: 'Kurzhanteln',
  bank: 'Hantelbank',
  kabel: 'Kabelzug',
  maschine: 'Maschinen',
  klimmzugstange: 'Klimmzugstange',
  dipbarren: 'Dipbarren',
  baender: 'Widerstandsbänder',
  kettlebell: 'Kettlebell',
  koerpergewicht: 'Körpergewicht',
}

export const SLOT_LABEL: Record<Slot, string> = {
  brust_compound: 'Brust (Drücken)',
  brust_schraeg: 'Obere Brust',
  brust_iso: 'Brust (Isolation)',
  ruecken_vertikal: 'Rücken (vertikal)',
  ruecken_horizontal: 'Rücken (Rudern)',
  schulter_press: 'Schulterdrücken',
  seitheben: 'Seitliche Schulter',
  hintere_schulter: 'Hintere Schulter',
  bizeps: 'Bizeps',
  trizeps: 'Trizeps',
  kniebeuge: 'Kniebeuge-Muster',
  hinge: 'Hüftstreckung',
  unilateral_bein: 'Einbeinig',
  quad_iso: 'Quadrizeps (Isolation)',
  beinbeuger_iso: 'Beinbeuger (Isolation)',
  gesaess_iso: 'Gesäß (Isolation)',
  waden: 'Waden',
  bauch: 'Bauch',
  unterarme: 'Unterarme und Griff',
}

export const GYM_EQUIPMENT: Equipment[] = [
  'langhantel',
  'kurzhantel',
  'bank',
  'kabel',
  'maschine',
  'klimmzugstange',
  'dipbarren',
  'baender',
  'kettlebell',
  'koerpergewicht',
]

export const HOME_EQUIPMENT_CHOICES: Equipment[] = [
  'kurzhantel',
  'bank',
  'langhantel',
  'klimmzugstange',
  'baender',
  'kettlebell',
  'dipbarren',
]
