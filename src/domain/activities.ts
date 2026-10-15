import type { L } from '../i18n/define'

export interface CardioActivity {
  id: string
  name: L
  /** MET values for leicht / mittel / intensiv (Compendium of Physical Activities as orientation). */
  met: [number, number, number]
}

const n = (de: string, en: string, vi: string): L => ({ de, en, vi })

export const CARDIO: CardioActivity[] = [
  { id: 'gehen', name: n('Spazieren / Gehen', 'Walking', 'Đi bộ'), met: [2.8, 3.5, 4.3] },
  { id: 'wandern', name: n('Wandern', 'Hiking', 'Leo núi / đi bộ đường dài'), met: [4.5, 6, 7.5] },
  { id: 'laufen', name: n('Laufen / Joggen', 'Running / jogging', 'Chạy bộ'), met: [7, 9.8, 11.8] },
  { id: 'radfahren', name: n('Radfahren', 'Cycling', 'Đạp xe'), met: [4, 6.8, 10] },
  { id: 'ergometer', name: n('Fahrradergometer', 'Stationary bike', 'Xe đạp tập'), met: [3.5, 6.8, 8.8] },
  { id: 'crosstrainer', name: n('Crosstrainer', 'Elliptical', 'Máy chạy elip'), met: [4.6, 5.8, 7.5] },
  { id: 'rudern', name: n('Rudergerät', 'Rowing machine', 'Máy chèo thuyền'), met: [4.8, 7, 8.5] },
  { id: 'stepper', name: n('Stepper / Treppen', 'Stair climber / stairs', 'Leo cầu thang'), met: [4, 8, 9] },
  { id: 'schwimmen', name: n('Schwimmen', 'Swimming', 'Bơi lội'), met: [5.8, 7, 9.8] },
  { id: 'seilspringen', name: n('Seilspringen', 'Jump rope', 'Nhảy dây'), met: [8.8, 11.8, 12.3] },
  { id: 'hiit', name: n('HIIT / Intervalle', 'HIIT / intervals', 'HIIT / tập ngắt quãng'), met: [6, 8, 10] },
  { id: 'fussball', name: n('Fußball', 'Football', 'Bóng đá'), met: [5, 7, 10] },
  { id: 'basketball', name: n('Basketball', 'Basketball', 'Bóng rổ'), met: [4.5, 6.5, 8] },
  { id: 'handball', name: n('Handball', 'Handball', 'Bóng ném'), met: [6, 8, 12] },
  { id: 'tennis', name: n('Tennis', 'Tennis', 'Quần vợt'), met: [5, 7.3, 8] },
  { id: 'badminton', name: n('Badminton', 'Badminton', 'Cầu lông'), met: [4.5, 5.5, 7] },
  { id: 'kampfsport', name: n('Kampfsport / Boxen', 'Martial arts / boxing', 'Võ thuật / quyền anh'), met: [5.5, 7.8, 10.3] },
  { id: 'klettern', name: n('Klettern / Bouldern', 'Climbing / bouldering', 'Leo núi trong nhà'), met: [5.8, 7.5, 8] },
  { id: 'yoga', name: n('Yoga', 'Yoga', 'Yoga'), met: [2.5, 3, 4] },
  { id: 'tanzen', name: n('Tanzen', 'Dancing', 'Khiêu vũ / nhảy'), met: [3.5, 5, 7.3] },
  { id: 'inliner', name: n('Inlineskaten', 'Inline skating', 'Trượt patin'), met: [7, 9.8, 12.3] },
  { id: 'ski', name: n('Skifahren', 'Skiing', 'Trượt tuyết'), met: [4.3, 5.3, 8] },
  { id: 'cau', name: n('Federfußball (Đá cầu)', 'Shuttlecock kicking (đá cầu)', 'Đá cầu'), met: [4, 5.5, 7] },
  { id: 'pickleball', name: n('Pickleball', 'Pickleball', 'Pickleball'), met: [4, 5, 6.5] },
]

export function cardioKcal(activity: CardioActivity, intensity: 1 | 2 | 3, minutes: number, weightKg: number): number {
  return Math.round(activity.met[intensity - 1] * weightKg * (minutes / 60))
}

export interface MobilityMove {
  name: L
  seconds: number
  cue: L
  /** Do both sides (seconds are per side). */
  sides?: boolean
}

export interface MobilityRoutine {
  id: string
  name: L
  focus: L
  moves: MobilityMove[]
}

const m = (name: L, seconds: number, cue: L, sides?: boolean): MobilityMove => ({ name, seconds, cue, sides })

export const MOBILITY: MobilityRoutine[] = [
  {
    id: 'morgen',
    name: n('Morgenroutine', 'Morning routine', 'Bài tập buổi sáng'),
    focus: n('Ganzer Körper, sanft wach werden', 'Whole body, wake up gently', 'Toàn thân, tỉnh táo nhẹ nhàng'),
    moves: [
      m(n('Katze-Kuh', 'Cat-cow', 'Tư thế mèo - bò'), 45, n('Im Vierfüßlerstand Wirbel für Wirbel rund und hohl werden.', 'On all fours, round and arch the spine vertebra by vertebra.', 'Chống tay và gối, lần lượt cong tròn rồi võng lưng từng đốt sống.')),
      m(n('Kindhaltung mit Seitneigung', 'Child’s pose with side reach', 'Tư thế em bé nghiêng người'), 30, n('Gesäß zu den Fersen, Arme nach vorn, dann zur Seite wandern.', 'Hips to heels, arms forward, then walk them to the side.', 'Mông về phía gót, tay duỗi trước rồi dịch sang một bên.'), true),
      m(n('Weltbeste Dehnung', 'World’s greatest stretch', 'Bài giãn cơ toàn diện'), 40, n('Tiefer Ausfallschritt, Ellbogen zum Fuß, dann Arm zur Decke öffnen.', 'Deep lunge, elbow to the foot, then open the arm to the ceiling.', 'Chùng chân sâu, khuỷu tay về phía bàn chân, rồi mở tay lên trần.'), true),
      m(n('Herabschauender Hund', 'Downward dog', 'Tư thế chó úp mặt'), 40, n('Hüfte hoch, Fersen Richtung Boden, abwechselnd Knie beugen.', 'Hips high, heels towards the floor, bend the knees alternately.', 'Đẩy hông cao, gót hướng xuống sàn, lần lượt gập từng gối.')),
      m(n('Tiefe Hocke halten', 'Deep squat hold', 'Giữ tư thế ngồi xổm sâu'), 45, n('Fersen am Boden, Ellbogen drücken Knie sanft nach außen.', 'Heels down, elbows gently push the knees out.', 'Gót chạm sàn, khuỷu tay nhẹ nhàng đẩy gối ra ngoài.')),
      m(n('Armkreisen', 'Arm circles', 'Xoay tay'), 30, n('Große, langsame Kreise vorwärts und rückwärts.', 'Big, slow circles forwards and backwards.', 'Xoay vòng lớn, chậm về trước và ra sau.')),
    ],
  },
  {
    id: 'huefte',
    name: n('Hüfte öffnen', 'Hip opener', 'Mở hông'),
    focus: n('Hüftbeuger, Adduktoren, Gesäß', 'Hip flexors, adductors, glutes', 'Cơ gập hông, đùi trong, mông'),
    moves: [
      m(n('90/90 Hüftrotation', '90/90 hip rotation', 'Xoay hông 90/90'), 45, n('Beide Knie 90° gebeugt, langsam von Seite zu Seite drehen.', 'Both knees bent 90°, rotate slowly from side to side.', 'Hai gối gập 90°, từ từ xoay từ bên này sang bên kia.')),
      m(n('Hüftbeuger-Dehnung kniend', 'Kneeling hip flexor stretch', 'Giãn cơ gập hông tư thế quỳ'), 40, n('Gesäß anspannen, Becken leicht nach vorn schieben.', 'Squeeze the glutes, push the pelvis slightly forward.', 'Siết mông, đẩy xương chậu nhẹ về trước.'), true),
      m(n('Taube', 'Pigeon', 'Tư thế bồ câu'), 45, n('Vorderes Bein quer, Oberkörper langsam nach vorn sinken lassen.', 'Front leg across, slowly let the torso sink forward.', 'Chân trước đặt ngang, từ từ hạ thân về trước.'), true),
      m(n('Froschdehnung', 'Frog stretch', 'Tư thế ếch'), 45, n('Knie weit auseinander, Hüfte sanft nach hinten schieben.', 'Knees wide apart, gently push the hips back.', 'Hai gối mở rộng, nhẹ nhàng đẩy hông ra sau.')),
      m(n('Cossack Squat', 'Cossack squat', 'Squat kiểu Cossack'), 40, n('Seitlich tief in ein Bein sitzen, das andere bleibt gestreckt.', 'Sit deep into one leg to the side, the other stays straight.', 'Ngồi sâu sang một chân, chân kia duỗi thẳng.')),
    ],
  },
  {
    id: 'schulter',
    name: n('Schultern und Brustwirbelsäule', 'Shoulders and upper back', 'Vai và lưng trên'),
    focus: n('Haltung, Überkopf-Beweglichkeit', 'Posture, overhead mobility', 'Tư thế, linh hoạt khi đưa tay qua đầu'),
    moves: [
      m(n('Thread the Needle', 'Thread the needle', 'Luồn kim'), 40, n('Im Vierfüßlerstand einen Arm unter dem Körper durchfädeln.', 'On all fours, thread one arm under the body.', 'Chống tay và gối, luồn một tay dưới thân.'), true),
      m(n('Offenes Buch', 'Open book', 'Mở sách'), 40, n('Seitlage, oberen Arm im Bogen nach hinten öffnen, Blick folgt.', 'Side-lying, open the top arm back in an arc, eyes follow.', 'Nằm nghiêng, mở tay trên ra sau theo vòng cung, mắt nhìn theo.'), true),
      m(n('Wandengel', 'Wall angels', 'Thiên thần trên tường'), 45, n('Rücken an der Wand, Arme wie beim Schneeengel hoch und runter.', 'Back against the wall, move the arms up and down like a snow angel.', 'Lưng áp tường, đưa tay lên xuống như vẽ thiên thần trên tuyết.')),
      m(n('Brustdehnung im Türrahmen', 'Doorway chest stretch', 'Giãn ngực ở khung cửa'), 40, n('Unterarm am Rahmen, Körper sanft nach vorn drehen.', 'Forearm on the frame, gently turn the body forward.', 'Cẳng tay tì khung cửa, nhẹ nhàng xoay người về trước.'), true),
      m(n('Schulter-Dislocates mit Band', 'Band shoulder dislocates', 'Xoay vai với dây'), 40, n('Band breit greifen, gestreckt über den Kopf nach hinten führen.', 'Grip the band wide, bring it straight-armed over the head to the back.', 'Cầm dây rộng, duỗi thẳng tay đưa qua đầu ra sau.')),
    ],
  },
  {
    id: 'ruecken',
    name: n('Unterer Rücken entlasten', 'Lower back relief', 'Thư giãn lưng dưới'),
    focus: n('Lendenwirbelsäule, Hüfte, Rumpf', 'Lower back, hips, core', 'Thắt lưng, hông, cơ trung tâm'),
    moves: [
      m(n('Knie zur Brust', 'Knees to chest', 'Ôm gối vào ngực'), 40, n('Rückenlage, beide Knie umarmen, sanft schaukeln.', 'Lie on your back, hug both knees, rock gently.', 'Nằm ngửa, ôm hai gối, đung đưa nhẹ.')),
      m(n('Liegende Drehdehnung', 'Lying spinal twist', 'Vặn người nằm ngửa'), 40, n('Knie zur Seite fallen lassen, Schultern bleiben am Boden.', 'Let the knees fall to the side, shoulders stay on the floor.', 'Để hai gối ngả sang một bên, vai vẫn áp sàn.'), true),
      m(n('Glute Bridge halten', 'Glute bridge hold', 'Giữ tư thế nâng hông'), 30, n('Hüfte hoch, Gesäß fest, ruhig atmen.', 'Hips up, glutes tight, breathe calmly.', 'Nâng hông, siết mông, thở đều.')),
      m(n('Bird Dog', 'Bird dog', 'Chim - chó (Bird dog)'), 40, n('Gegengleich Arm und Bein strecken, Becken bleibt ruhig.', 'Extend opposite arm and leg, keep the pelvis still.', 'Duỗi tay và chân đối diện, giữ xương chậu yên.')),
      m(n('Kindhaltung', 'Child’s pose', 'Tư thế em bé'), 45, n('Tief in den Rücken atmen.', 'Breathe deeply into the back.', 'Hít thở sâu vào vùng lưng.')),
    ],
  },
  {
    id: 'nach-training',
    name: n('Cool-down nach dem Training', 'Post-workout cool-down', 'Thả lỏng sau buổi tập'),
    focus: n('Runterfahren, Puls senken', 'Wind down, lower the heart rate', 'Thả lỏng, hạ nhịp tim'),
    moves: [
      m(n('Beinbeuger-Dehnung', 'Hamstring stretch', 'Giãn đùi sau'), 40, n('Bein gestreckt auf Erhöhung, Oberkörper gerade nach vorn.', 'Leg straight on a raised surface, torso straight forward.', 'Gác chân thẳng lên chỗ cao, thân thẳng nghiêng về trước.'), true),
      m(n('Quadrizeps-Dehnung', 'Quad stretch', 'Giãn đùi trước'), 40, n('Ferse zum Gesäß ziehen, Knie zeigt nach unten.', 'Pull the heel to the glutes, knee points down.', 'Kéo gót về mông, gối hướng xuống dưới.'), true),
      m(n('Latissimus-Dehnung', 'Lat stretch', 'Giãn cơ xô'), 40, n('An Stange oder Tür festhalten, Hüfte nach hinten schieben.', 'Hold on to a bar or door, push the hips back.', 'Vịn thanh xà hoặc cửa, đẩy hông ra sau.'), true),
      m(n('Waden-Dehnung an der Wand', 'Wall calf stretch', 'Giãn bắp chân với tường'), 30, n('Hinteres Bein gestreckt, Ferse am Boden.', 'Rear leg straight, heel on the floor.', 'Chân sau duỗi thẳng, gót chạm sàn.'), true),
      m(n('Box Breathing', 'Box breathing', 'Thở hộp (Box breathing)'), 60, n('4 Sekunden ein, 4 halten, 4 aus, 4 halten.', 'In for 4 seconds, hold 4, out 4, hold 4.', 'Hít vào 4 giây, giữ 4, thở ra 4, giữ 4.')),
    ],
  },
  {
    id: 'schreibtisch',
    name: n('Schreibtisch-Reset', 'Desk reset', 'Thư giãn bàn làm việc'),
    focus: n('5 Minuten gegen langes Sitzen', '5 minutes against long sitting', '5 phút chống ngồi lâu'),
    moves: [
      m(n('Nackenneigung', 'Neck tilt', 'Nghiêng cổ'), 30, n('Ohr Richtung Schulter, gegenüberliegende Schulter sinken lassen.', 'Ear towards the shoulder, let the opposite shoulder drop.', 'Nghiêng tai về phía vai, thả vai bên kia xuống.'), true),
      m(n('Schulterkreisen', 'Shoulder rolls', 'Xoay vai'), 30, n('Langsam nach hinten kreisen.', 'Roll slowly backwards.', 'Xoay vai chậm ra sau.')),
      m(n('Stehende Hüftbeuger-Dehnung', 'Standing hip flexor stretch', 'Giãn cơ gập hông tư thế đứng'), 30, n('Schritt nach hinten, Becken nach vorn.', 'Step back, pelvis forward.', 'Bước lùi một chân, đẩy xương chậu về trước.'), true),
      m(n('Vorbeuge hängen lassen', 'Forward fold', 'Gập người thả lỏng'), 40, n('Knie locker, Oberkörper hängen lassen, Kopf entspannt.', 'Knees soft, let the torso hang, head relaxed.', 'Gối thả lỏng, để thân buông xuống, đầu thư giãn.')),
      m(n('Brustöffner', 'Chest opener', 'Mở ngực'), 30, n('Hände hinter dem Rücken verschränken, Brust heben.', 'Clasp the hands behind the back, lift the chest.', 'Đan tay sau lưng, nâng ngực lên.')),
    ],
  },
  {
    id: 'sprunggelenk',
    name: n('Knie und Sprunggelenk', 'Knees and ankles', 'Gối và cổ chân'),
    focus: n('Tiefere Kniebeuge, gesunde Knie', 'Deeper squats, healthy knees', 'Squat sâu hơn, gối khỏe'),
    moves: [
      m(n('Knie-zur-Wand', 'Knee to wall', 'Đẩy gối chạm tường'), 40, n('Fuß vor der Wand, Knie über die Zehen zur Wand schieben.', 'Foot in front of the wall, push the knee over the toes to the wall.', 'Bàn chân trước tường, đẩy gối qua mũi chân chạm tường.'), true),
      m(n('Wadenheben langsam', 'Slow calf raises', 'Nhón bắp chân chậm'), 40, n('3 Sekunden hoch, 3 Sekunden runter.', '3 seconds up, 3 seconds down.', '3 giây lên, 3 giây xuống.')),
      m(n('Spanish Squat halten', 'Spanish squat hold', 'Giữ Spanish squat'), 30, n('Isometrisch halten, beruhigt gereizte Patellasehnen.', 'Hold isometrically, calms irritated patellar tendons.', 'Giữ tĩnh, giúp làm dịu gân bánh chè bị kích ứng.')),
      m(n('Tibialis heben', 'Tibialis raises', 'Nâng mũi chân'), 30, n('Rücken an der Wand, Fußspitzen anheben.', 'Back against the wall, lift the toes.', 'Lưng áp tường, nhấc mũi chân lên.')),
      m(n('Tiefe Hocke mit Gewichtsverlagerung', 'Deep squat weight shifts', 'Ngồi xổm sâu chuyển trọng tâm'), 45, n('In der Hocke langsam von Fuß zu Fuß verlagern.', 'In the squat, shift slowly from foot to foot.', 'Trong tư thế ngồi xổm, chuyển trọng tâm chậm từ chân này sang chân kia.')),
    ],
  },
]

export function routineSeconds(r: MobilityRoutine): number {
  return r.moves.reduce((a, mv) => a + mv.seconds * (mv.sides ? 2 : 1), 0)
}
