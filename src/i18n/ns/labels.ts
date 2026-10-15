import { ns } from '../define'

/** Muscles, equipment and movement slots (keys match the domain ids). */
export const labels = ns({
  de: {
    muscle: { brust: 'Brust', ruecken: 'Rücken', schultern: 'Schultern', bizeps: 'Bizeps', trizeps: 'Trizeps', quadrizeps: 'Quadrizeps', beinbeuger: 'Beinbeuger', gesaess: 'Gesäß', waden: 'Waden', bauch: 'Bauch', unterarme: 'Unterarme' },
    equipment: { langhantel: 'Langhantel', kurzhantel: 'Kurzhanteln', bank: 'Hantelbank', kabel: 'Kabelzug', maschine: 'Maschinen', klimmzugstange: 'Klimmzugstange', dipbarren: 'Dipbarren', baender: 'Widerstandsbänder', kettlebell: 'Kettlebell', koerpergewicht: 'Körpergewicht' },
    slot: {
      brust_compound: 'Brust (Drücken)', brust_schraeg: 'Obere Brust', brust_iso: 'Brust (Isolation)', ruecken_vertikal: 'Rücken (vertikal)', ruecken_horizontal: 'Rücken (Rudern)', schulter_press: 'Schulterdrücken', seitheben: 'Seitliche Schulter', hintere_schulter: 'Hintere Schulter', bizeps: 'Bizeps', trizeps: 'Trizeps', kniebeuge: 'Kniebeuge-Muster', hinge: 'Hüftstreckung', unilateral_bein: 'Einbeinig', quad_iso: 'Quadrizeps (Isolation)', beinbeuger_iso: 'Beinbeuger (Isolation)', gesaess_iso: 'Gesäß (Isolation)', waden: 'Waden', bauch: 'Bauch', unterarme: 'Unterarme und Griff',
    },
  },
  en: {
    muscle: { brust: 'Chest', ruecken: 'Back', schultern: 'Shoulders', bizeps: 'Biceps', trizeps: 'Triceps', quadrizeps: 'Quads', beinbeuger: 'Hamstrings', gesaess: 'Glutes', waden: 'Calves', bauch: 'Abs', unterarme: 'Forearms' },
    equipment: { langhantel: 'Barbell', kurzhantel: 'Dumbbells', bank: 'Bench', kabel: 'Cable', maschine: 'Machines', klimmzugstange: 'Pull-up bar', dipbarren: 'Dip bars', baender: 'Resistance bands', kettlebell: 'Kettlebell', koerpergewicht: 'Bodyweight' },
    slot: {
      brust_compound: 'Chest (press)', brust_schraeg: 'Upper chest', brust_iso: 'Chest (isolation)', ruecken_vertikal: 'Back (vertical)', ruecken_horizontal: 'Back (rows)', schulter_press: 'Shoulder press', seitheben: 'Side delts', hintere_schulter: 'Rear delts', bizeps: 'Biceps', trizeps: 'Triceps', kniebeuge: 'Squat pattern', hinge: 'Hip hinge', unilateral_bein: 'Single-leg', quad_iso: 'Quads (isolation)', beinbeuger_iso: 'Hamstrings (isolation)', gesaess_iso: 'Glutes (isolation)', waden: 'Calves', bauch: 'Abs', unterarme: 'Forearms and grip',
    },
  },
  vi: {
    muscle: { brust: 'Ngực', ruecken: 'Lưng', schultern: 'Vai', bizeps: 'Bắp tay trước', trizeps: 'Bắp tay sau', quadrizeps: 'Đùi trước', beinbeuger: 'Đùi sau', gesaess: 'Mông', waden: 'Bắp chân', bauch: 'Bụng', unterarme: 'Cẳng tay' },
    equipment: { langhantel: 'Tạ đòn', kurzhantel: 'Tạ đơn', bank: 'Ghế tập', kabel: 'Máy cáp', maschine: 'Máy tập', klimmzugstange: 'Xà đơn', dipbarren: 'Xà kép', baender: 'Dây kháng lực', kettlebell: 'Tạ ấm', koerpergewicht: 'Trọng lượng cơ thể' },
    slot: {
      brust_compound: 'Ngực (đẩy)', brust_schraeg: 'Ngực trên', brust_iso: 'Ngực (cô lập)', ruecken_vertikal: 'Lưng (kéo dọc)', ruecken_horizontal: 'Lưng (kéo ngang)', schulter_press: 'Đẩy vai', seitheben: 'Vai giữa', hintere_schulter: 'Vai sau', bizeps: 'Bắp tay trước', trizeps: 'Bắp tay sau', kniebeuge: 'Kiểu squat', hinge: 'Gập hông', unilateral_bein: 'Một chân', quad_iso: 'Đùi trước (cô lập)', beinbeuger_iso: 'Đùi sau (cô lập)', gesaess_iso: 'Mông (cô lập)', waden: 'Bắp chân', bauch: 'Bụng', unterarme: 'Cẳng tay và sức nắm',
    },
  },
})
