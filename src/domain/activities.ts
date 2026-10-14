export interface CardioActivity {
  id: string
  name: string
  /** MET values for leicht / mittel / intensiv (Compendium of Physical Activities as orientation). */
  met: [number, number, number]
}

export const CARDIO: CardioActivity[] = [
  { id: 'gehen', name: 'Spazieren / Gehen', met: [2.8, 3.5, 4.3] },
  { id: 'wandern', name: 'Wandern', met: [4.5, 6, 7.5] },
  { id: 'laufen', name: 'Laufen / Joggen', met: [7, 9.8, 11.8] },
  { id: 'radfahren', name: 'Radfahren', met: [4, 6.8, 10] },
  { id: 'ergometer', name: 'Fahrradergometer', met: [3.5, 6.8, 8.8] },
  { id: 'crosstrainer', name: 'Crosstrainer', met: [4.6, 5.8, 7.5] },
  { id: 'rudern', name: 'Rudergerät', met: [4.8, 7, 8.5] },
  { id: 'stepper', name: 'Stepper / Treppen', met: [4, 8, 9] },
  { id: 'schwimmen', name: 'Schwimmen', met: [5.8, 7, 9.8] },
  { id: 'seilspringen', name: 'Seilspringen', met: [8.8, 11.8, 12.3] },
  { id: 'hiit', name: 'HIIT / Intervalle', met: [6, 8, 10] },
  { id: 'fussball', name: 'Fußball', met: [5, 7, 10] },
  { id: 'basketball', name: 'Basketball', met: [4.5, 6.5, 8] },
  { id: 'handball', name: 'Handball', met: [6, 8, 12] },
  { id: 'tennis', name: 'Tennis', met: [5, 7.3, 8] },
  { id: 'badminton', name: 'Badminton', met: [4.5, 5.5, 7] },
  { id: 'kampfsport', name: 'Kampfsport / Boxen', met: [5.5, 7.8, 10.3] },
  { id: 'klettern', name: 'Klettern / Bouldern', met: [5.8, 7.5, 8] },
  { id: 'yoga', name: 'Yoga', met: [2.5, 3, 4] },
  { id: 'tanzen', name: 'Tanzen', met: [3.5, 5, 7.3] },
  { id: 'inliner', name: 'Inlineskaten', met: [7, 9.8, 12.3] },
  { id: 'ski', name: 'Skifahren', met: [4.3, 5.3, 8] },
]

export function cardioKcal(activity: CardioActivity, intensity: 1 | 2 | 3, minutes: number, weightKg: number): number {
  return Math.round(activity.met[intensity - 1] * weightKg * (minutes / 60))
}

export interface MobilityMove {
  name: string
  seconds: number
  cue: string
  /** Do both sides (seconds are per side). */
  sides?: boolean
}

export interface MobilityRoutine {
  id: string
  name: string
  focus: string
  moves: MobilityMove[]
}

export const MOBILITY: MobilityRoutine[] = [
  {
    id: 'morgen',
    name: 'Morgenroutine',
    focus: 'Ganzer Körper, sanft wach werden',
    moves: [
      { name: 'Katze-Kuh', seconds: 45, cue: 'Im Vierfüßlerstand Wirbel für Wirbel rund und hohl werden.' },
      { name: 'Kindhaltung mit Seitneigung', seconds: 30, cue: 'Gesäß zu den Fersen, Arme nach vorn, dann zur Seite wandern.', sides: true },
      { name: 'Weltbeste Dehnung', seconds: 40, cue: 'Tiefer Ausfallschritt, Ellbogen zum Fuß, dann Arm zur Decke öffnen.', sides: true },
      { name: 'Herabschauender Hund', seconds: 40, cue: 'Hüfte hoch, Fersen Richtung Boden, abwechselnd Knie beugen.' },
      { name: 'Tiefe Hocke halten', seconds: 45, cue: 'Fersen am Boden, Ellbogen drücken Knie sanft nach außen.' },
      { name: 'Armkreisen', seconds: 30, cue: 'Große, langsame Kreise vorwärts und rückwärts.' },
    ],
  },
  {
    id: 'huefte',
    name: 'Hüfte öffnen',
    focus: 'Hüftbeuger, Adduktoren, Gesäß',
    moves: [
      { name: '90/90 Hüftrotation', seconds: 45, cue: 'Beide Knie 90° gebeugt, langsam von Seite zu Seite drehen.' },
      { name: 'Hüftbeuger-Dehnung kniend', seconds: 40, cue: 'Gesäß anspannen, Becken leicht nach vorn schieben.', sides: true },
      { name: 'Taube', seconds: 45, cue: 'Vorderes Bein quer, Oberkörper langsam nach vorn sinken lassen.', sides: true },
      { name: 'Froschdehnung', seconds: 45, cue: 'Knie weit auseinander, Hüfte sanft nach hinten schieben.' },
      { name: 'Cossack Squat', seconds: 40, cue: 'Seitlich tief in ein Bein sitzen, das andere bleibt gestreckt.' },
    ],
  },
  {
    id: 'schulter',
    name: 'Schultern und Brustwirbelsäule',
    focus: 'Haltung, Überkopf-Beweglichkeit',
    moves: [
      { name: 'Thread the Needle', seconds: 40, cue: 'Im Vierfüßlerstand einen Arm unter dem Körper durchfädeln.', sides: true },
      { name: 'Offenes Buch', seconds: 40, cue: 'Seitlage, oberen Arm im Bogen nach hinten öffnen, Blick folgt.', sides: true },
      { name: 'Wandengel', seconds: 45, cue: 'Rücken an der Wand, Arme wie beim Schneeengel hoch und runter.' },
      { name: 'Brustdehnung im Türrahmen', seconds: 40, cue: 'Unterarm am Rahmen, Körper sanft nach vorn drehen.', sides: true },
      { name: 'Schulter-Dislocates mit Band', seconds: 40, cue: 'Band breit greifen, gestreckt über den Kopf nach hinten führen.' },
    ],
  },
  {
    id: 'ruecken',
    name: 'Unterer Rücken entlasten',
    focus: 'Lendenwirbelsäule, Hüfte, Rumpf',
    moves: [
      { name: 'Knie zur Brust', seconds: 40, cue: 'Rückenlage, beide Knie umarmen, sanft schaukeln.' },
      { name: 'Liegende Drehdehnung', seconds: 40, cue: 'Knie zur Seite fallen lassen, Schultern bleiben am Boden.', sides: true },
      { name: 'Glute Bridge halten', seconds: 30, cue: 'Hüfte hoch, Gesäß fest, ruhig atmen.' },
      { name: 'Bird Dog', seconds: 40, cue: 'Gegengleich Arm und Bein strecken, Becken bleibt ruhig.' },
      { name: 'Kindhaltung', seconds: 45, cue: 'Tief in den Rücken atmen.' },
    ],
  },
  {
    id: 'nach-training',
    name: 'Cool-down nach dem Training',
    focus: 'Runterfahren, Puls senken',
    moves: [
      { name: 'Beinbeuger-Dehnung', seconds: 40, cue: 'Bein gestreckt auf Erhöhung, Oberkörper gerade nach vorn.', sides: true },
      { name: 'Quadrizeps-Dehnung', seconds: 40, cue: 'Ferse zum Gesäß ziehen, Knie zeigt nach unten.', sides: true },
      { name: 'Latissimus-Dehnung', seconds: 40, cue: 'An Stange oder Tür festhalten, Hüfte nach hinten schieben.', sides: true },
      { name: 'Waden-Dehnung an der Wand', seconds: 30, cue: 'Hinteres Bein gestreckt, Ferse am Boden.', sides: true },
      { name: 'Box Breathing', seconds: 60, cue: '4 Sekunden ein, 4 halten, 4 aus, 4 halten.' },
    ],
  },
  {
    id: 'schreibtisch',
    name: 'Schreibtisch-Reset',
    focus: '5 Minuten gegen langes Sitzen',
    moves: [
      { name: 'Nackenneigung', seconds: 30, cue: 'Ohr Richtung Schulter, gegenüberliegende Schulter sinken lassen.', sides: true },
      { name: 'Schulterkreisen', seconds: 30, cue: 'Langsam nach hinten kreisen.' },
      { name: 'Stehende Hüftbeuger-Dehnung', seconds: 30, cue: 'Schritt nach hinten, Becken nach vorn.', sides: true },
      { name: 'Vorbeuge hängen lassen', seconds: 40, cue: 'Knie locker, Oberkörper hängen lassen, Kopf entspannt.' },
      { name: 'Brustöffner', seconds: 30, cue: 'Hände hinter dem Rücken verschränken, Brust heben.' },
    ],
  },
  {
    id: 'sprunggelenk',
    name: 'Knie und Sprunggelenk',
    focus: 'Tiefere Kniebeuge, gesunde Knie',
    moves: [
      { name: 'Knie-zur-Wand', seconds: 40, cue: 'Fuß vor der Wand, Knie über die Zehen zur Wand schieben.', sides: true },
      { name: 'Wadenheben langsam', seconds: 40, cue: '3 Sekunden hoch, 3 Sekunden runter.' },
      { name: 'Spanish Squat halten', seconds: 30, cue: 'Isometrisch halten, beruhigt gereizte Patellasehnen.' },
      { name: 'Tibialis heben', seconds: 30, cue: 'Rücken an der Wand, Fußspitzen anheben.' },
      { name: 'Tiefe Hocke mit Gewichtsverlagerung', seconds: 45, cue: 'In der Hocke langsam von Fuß zu Fuß verlagern.' },
    ],
  },
]

export function routineSeconds(r: MobilityRoutine): number {
  return r.moves.reduce((a, m) => a + m.seconds * (m.sides ? 2 : 1), 0)
}
