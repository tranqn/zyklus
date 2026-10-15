// Movement patterns. Poses use a hip position plus angles or IK targets (see rig.mjs).
// Angles: 0 = up, 90 = forward (figure faces right), 180 = down, 270 = back.

import { FLOOR_Y } from './rig.mjs'

const ANKLE_Y = FLOOR_Y - 6
const X = 180
const hangArms = [180, 180]
const feet = (x = X, y = ANKLE_Y) => ({ ik: [x, y], bend: 'fwd', foot: 90 })

const hands = (x, y, bend = 'fwd') => ({ ik: [x, y], bend })
/** face-down straight body; hip y/x and torso angle from the toe pivot (see push_up) */
const plank = (hipY, hipX, torso) => ({
  torso,
  armN: hands(104, FLOOR_Y - 4),
  armF: hands(104, FLOOR_Y - 4),
  legN: { ik: [318, ANKLE_Y], bend: 'back', foot: 160 },
  legF: { ik: [318, ANKLE_Y], bend: 'back', foot: 160 },
  root: { by: 'hip', at: [hipX, hipY] },
})

/** standing, arms down */
const stand = (over = {}) => ({ torso: 0, armN: hangArms, armF: hangArms, legN: feet(), legF: feet(), root: { by: 'hip', at: [X - 4, ANKLE_Y - 150] }, ...over })

const seatedLegs = (hipX, footX = hipX + 70) => ({ legN: feet(footX), legF: feet(footX - 6) })

export const PATTERNS = {
  squat: {
    label: 'Kniebeuge',
    props: [{ type: 'backbar' }],
    phases: [
      { pose: stand({ torso: 6, armN: [235, 15], armF: [230, 12] }), hold: 0.3, move: 1.1 },
      { pose: stand({ torso: 38, armN: [265, 40], armF: [260, 38], root: { by: 'hip', at: [X - 52, ANKLE_Y - 78] } }), hold: 0.15, move: 1.1 },
    ],
  },
  squat_goblet: {
    label: 'Goblet Squat',
    props: [{ type: 'dumbbells' }],
    phases: [
      { pose: stand({ torso: 4, armN: [150, 20], armF: [148, 18] }), hold: 0.3, move: 1.1 },
      { pose: stand({ torso: 22, armN: [168, 40], armF: [166, 38], root: { by: 'hip', at: [X - 40, ANKLE_Y - 72] } }), hold: 0.15, move: 1.1 },
    ],
  },
  hinge: {
    label: 'Hüftbeugen (Rumänisches Kreuzheben)',
    props: [{ type: 'plate' }],
    phases: [
      { pose: stand({ torso: 2, armN: [182, 182], armF: [182, 182] }), hold: 0.3, move: 1.2 },
      { pose: stand({ torso: 78, armN: [178, 180], armF: [178, 180], root: { by: 'hip', at: [X - 46, ANKLE_Y - 138] } }), hold: 0.15, move: 1.0 },
    ],
  },
  bench_press: {
    label: 'Bankdrücken',
    props: [{ type: 'bench', x: 168, y: 240, w: 190 }, { type: 'plate' }],
    phases: [
      {
        pose: { torso: 270, armN: { ik: [118, 112], bend: 'fwd' }, armF: { ik: [118, 112], bend: 'fwd' }, legN: feet(258), legF: feet(250), root: { by: 'hip', at: [208, 220] } },
        hold: 0.3,
        move: 1.2,
      },
      {
        pose: { torso: 270, armN: { ik: [124, 196], bend: 'fwd' }, armF: { ik: [124, 196], bend: 'fwd' }, legN: feet(258), legF: feet(250), root: { by: 'hip', at: [208, 220] } },
        hold: 0.1,
        move: 0.9,
      },
    ],
  },
  // body pivots around the toes (318, ankle); hands stay planted, elbows point to the feet
  push_up: {
    label: 'Liegestütz',
    phases: [
      { pose: plank(253, 182, 295), hold: 0.25, move: 1.0 },
      { pose: plank(294, 170, 279), hold: 0.1, move: 0.9 },
    ],
  },
  curl: {
    label: 'Bizepscurl',
    props: [{ type: 'dumbbells' }],
    phases: [
      { pose: stand({ armN: [178, 178], armF: [176, 176] }), hold: 0.25, move: 1.0 },
      { pose: stand({ armN: [172, 25], armF: [170, 20] }), hold: 0.15, move: 1.1 },
    ],
  },
  squat_bw: {
    label: 'Kniebeuge (Körpergewicht)',
    phases: [
      { pose: stand({ torso: 4, armN: [150, 140], armF: [148, 138] }), hold: 0.3, move: 1.1 },
      { pose: stand({ torso: 30, armN: [95, 92], armF: [93, 90], root: { by: 'hip', at: [X - 48, ANKLE_Y - 76] } }), hold: 0.15, move: 1.1 },
    ],
  },
  deadlift: {
    label: 'Kreuzheben',
    props: [{ type: 'plate' }],
    phases: [
      { pose: stand({ torso: 52, armN: hands(204, 296, 'back'), armF: hands(204, 296, 'back'), root: { by: 'hip', at: [128, 244] } }), hold: 0.3, move: 1.2 },
      { pose: stand({ torso: 2, armN: hands(180, 180, 'back'), armF: hands(180, 180, 'back') }), hold: 0.3, move: 1.1 },
    ],
  },
  kb_swing: {
    label: 'Kettlebell Swing',
    props: [{ type: 'plate', d: 34 }],
    phases: [
      { pose: stand({ torso: 68, armN: [205, 210], armF: [203, 208], root: { by: 'hip', at: [X - 44, ANKLE_Y - 132] } }), move: 0.55 },
      { pose: stand({ torso: 0, armN: [92, 90], armF: [90, 88] }), hold: 0.12, move: 0.6 },
    ],
  },
  hip_thrust: {
    label: 'Hip Thrust',
    props: [{ type: 'bench', x: 58, y: 250, w: 84 }, { type: 'hipbar' }],
    phases: [
      { pose: { torso: 304, armN: hands(150, 268), armF: hands(150, 268), legN: feet(234), legF: feet(228), root: { by: 'hip', at: [150, 282] } }, hold: 0.2, move: 0.9 },
      { pose: { torso: 268, armN: hands(170, 216), armF: hands(170, 216), legN: feet(234), legF: feet(228), root: { by: 'hip', at: [170, 228] } }, hold: 0.35, move: 0.9 },
    ],
  },
  glute_bridge: {
    label: 'Glute Bridge',
    phases: [
      { pose: { torso: 270, armN: [100, 92], armF: [100, 92], legN: feet(244), legF: feet(240), root: { by: 'hip', at: [178, ANKLE_Y - 6] } }, hold: 0.2, move: 0.8 },
      { pose: { torso: 243, armN: [120, 100], armF: [120, 100], legN: feet(244), legF: feet(240), root: { by: 'hip', at: [176, ANKLE_Y - 48] } }, hold: 0.4, move: 0.8 },
    ],
  },
  lunge: {
    label: 'Ausfallschritt / Split Squat',
    props: [{ type: 'dumbbells' }],
    phases: [
      { pose: { torso: 3, armN: hangArms, armF: hangArms, legN: feet(222), legF: { ik: [118, ANKLE_Y - 8], bend: 'fwd', foot: 150 }, root: { by: 'hip', at: [170, ANKLE_Y - 142] } }, hold: 0.25, move: 1.1 },
      { pose: { torso: 5, armN: hangArms, armF: hangArms, legN: feet(222), legF: { ik: [118, ANKLE_Y - 8], bend: 'fwd', foot: 150 }, root: { by: 'hip', at: [162, ANKLE_Y - 84] } }, hold: 0.1, move: 1.0 },
    ],
  },
  bulgarian: {
    label: 'Bulgarische Split Squats',
    props: [{ type: 'bench', x: 70, y: 262, w: 70 }, { type: 'dumbbells' }],
    phases: [
      { pose: { torso: 4, armN: hangArms, armF: hangArms, legN: feet(222), legF: { ik: [88, 248], bend: 'fwd', foot: 250 }, root: { by: 'hip', at: [174, ANKLE_Y - 144] } }, hold: 0.25, move: 1.1 },
      { pose: { torso: 10, armN: hangArms, armF: hangArms, legN: feet(222), legF: { ik: [88, 248], bend: 'fwd', foot: 250 }, root: { by: 'hip', at: [158, ANKLE_Y - 86] } }, hold: 0.1, move: 1.0 },
    ],
  },
  leg_press: {
    label: 'Beinpresse',
    props: [{ type: 'block', x: 96, y: 236, w: 26, h: 120 }, { type: 'footplate' }],
    phases: [
      { pose: { torso: 318, armN: [150, 110], armF: [150, 110], legN: { ik: [212, 150], bend: 'fwd', foot: 20 }, legF: { ik: [208, 152], bend: 'fwd', foot: 20 }, root: { by: 'hip', at: [138, 258] } }, hold: 0.15, move: 1.1 },
      { pose: { torso: 318, armN: [150, 110], armF: [150, 110], legN: { ik: [270, 118], bend: 'fwd', foot: 20 }, legF: { ik: [266, 120], bend: 'fwd', foot: 20 }, root: { by: 'hip', at: [138, 258] } }, hold: 0.25, move: 1.0 },
    ],
  },
  incline_press: {
    label: 'Schrägbankdrücken',
    props: [{ type: 'bench', x: 160, y: 262, w: 120, legs: false }, { type: 'plate' }],
    phases: [
      { pose: { torso: 300, armN: hands(146, 82, 'fwd'), armF: hands(146, 82, 'fwd'), legN: feet(262), legF: feet(256), root: { by: 'hip', at: [196, 246] } }, hold: 0.3, move: 1.2 },
      { pose: { torso: 300, armN: hands(140, 168, 'fwd'), armF: hands(140, 168, 'fwd'), legN: feet(262), legF: feet(256), root: { by: 'hip', at: [196, 246] } }, hold: 0.1, move: 0.9 },
    ],
  },
  dips: {
    label: 'Dips',
    floor: false,
    props: [{ type: 'bar', x: 192, y: 200 }],
    phases: [
      { pose: { torso: 6, armN: hands(192, 198, 'back'), armF: hands(192, 198, 'back'), legN: [176, 236, 190], legF: [180, 240, 194], root: { by: 'hip', at: [178, 186] } }, hold: 0.25, move: 1.0 },
      { pose: { torso: 18, armN: hands(192, 198, 'back'), armF: hands(192, 198, 'back'), legN: [176, 236, 190], legF: [180, 240, 194], root: { by: 'hip', at: [164, 232] } }, hold: 0.1, move: 0.9 },
    ],
  },
  shoulder_press: {
    label: 'Schulterdrücken (sitzend)',
    props: [{ type: 'bench', x: 168, y: 268, w: 70 }, { type: 'dumbbells' }],
    phases: [
      { pose: { torso: 356, armN: hands(190, 164, 'back'), armF: hands(186, 166, 'back'), ...seatedLegs(168), root: { by: 'hip', at: [168, 254] } }, hold: 0.2, move: 1.0 },
      { pose: { torso: 356, armN: hands(176, 56, 'back'), armF: hands(172, 58, 'back'), ...seatedLegs(168), root: { by: 'hip', at: [168, 254] } }, hold: 0.25, move: 1.1 },
    ],
  },
  row_bent: {
    label: 'Vorgebeugtes Rudern',
    props: [{ type: 'plate', d: 44 }],
    phases: [
      { pose: stand({ torso: 70, armN: hands(226, 250, 'back'), armF: hands(226, 250, 'back'), root: { by: 'hip', at: [140, 178] } }), hold: 0.2, move: 0.9 },
      { pose: stand({ torso: 70, armN: hands(184, 186, 'back'), armF: hands(184, 186, 'back'), root: { by: 'hip', at: [140, 178] } }), hold: 0.3, move: 1.0 },
    ],
  },
  row_seated: {
    label: 'Rudern sitzend (Kabel)',
    props: [{ type: 'block', x: 132, y: 300, w: 64, h: 16 }, { type: 'handle' }],
    phases: [
      { pose: { torso: 12, armN: hands(236, 210, 'back'), armF: hands(236, 212, 'back'), legN: { ik: [270, 282], bend: 'fwd', foot: 0 }, legF: { ik: [266, 284], bend: 'fwd', foot: 0 }, root: { by: 'hip', at: [132, 284] } }, hold: 0.15, move: 1.0 },
      { pose: { torso: 352, armN: hands(156, 222, 'back'), armF: hands(154, 224, 'back'), legN: { ik: [270, 282], bend: 'fwd', foot: 0 }, legF: { ik: [266, 284], bend: 'fwd', foot: 0 }, root: { by: 'hip', at: [132, 284] } }, hold: 0.3, move: 1.0 },
    ],
  },
  pullup: {
    label: 'Klimmzug',
    floor: false,
    props: [{ type: 'bar', x: 182, y: 40 }],
    phases: [
      { pose: { torso: 4, armN: hands(182, 46, 'back'), armF: hands(182, 46, 'back'), legN: [176, 226, 160], legF: [180, 232, 166], root: { by: 'hip', at: [176, 244] } }, hold: 0.25, move: 1.1 },
      { pose: { torso: 10, armN: hands(182, 46, 'back'), armF: hands(182, 46, 'back'), legN: [170, 222, 156], legF: [174, 228, 162], root: { by: 'hip', at: [166, 186] } }, hold: 0.2, move: 1.1 },
    ],
  },
  lat_pulldown: {
    label: 'Latzug',
    props: [{ type: 'block', x: 160, y: 274, w: 60, h: 14 }, { type: 'handle' }],
    phases: [
      { pose: { torso: 354, armN: hands(170, 62, 'back'), armF: hands(166, 64, 'back'), ...seatedLegs(160), root: { by: 'hip', at: [160, 258] } }, hold: 0.15, move: 1.0 },
      { pose: { torso: 346, armN: hands(176, 166, 'back'), armF: hands(172, 168, 'back'), ...seatedLegs(160), root: { by: 'hip', at: [160, 258] } }, hold: 0.3, move: 1.1 },
    ],
  },
  lateral_raise: {
    label: 'Seitheben (Frontansicht)',
    props: [{ type: 'dumbbells' }],
    phases: [
      { pose: stand({ armN: [170, 172], armF: [190, 188], legN: feet(196), legF: feet(164) }), hold: 0.2, move: 1.0 },
      { pose: stand({ armN: [96, 100], armF: [264, 260], legN: feet(196), legF: feet(164) }), hold: 0.25, move: 1.1 },
    ],
  },
  triceps_pushdown: {
    label: 'Trizepsdrücken',
    props: [{ type: 'handle' }],
    phases: [
      { pose: stand({ torso: 10, armN: [176, 70], armF: [174, 68] }), hold: 0.15, move: 0.9 },
      { pose: stand({ torso: 10, armN: [176, 174], armF: [174, 172] }), hold: 0.3, move: 1.0 },
    ],
  },
  triceps_overhead: {
    label: 'Überkopf-Trizepsstrecken',
    props: [{ type: 'bench', x: 168, y: 268, w: 70 }, { type: 'dumbbells' }],
    phases: [
      { pose: { torso: 358, armN: [352, 196], armF: [350, 194], ...seatedLegs(168), root: { by: 'hip', at: [168, 254] } }, hold: 0.15, move: 1.0 },
      { pose: { torso: 358, armN: [352, 354], armF: [350, 352], ...seatedLegs(168), root: { by: 'hip', at: [168, 254] } }, hold: 0.3, move: 1.0 },
    ],
  },
  skullcrusher: {
    label: 'Stirndrücken',
    props: [{ type: 'bench', x: 168, y: 240, w: 190 }, { type: 'plate', d: 40 }],
    phases: [
      { pose: { torso: 270, armN: [352, 352], armF: [352, 352], legN: feet(258), legF: feet(250), root: { by: 'hip', at: [208, 220] } }, hold: 0.25, move: 1.0 },
      { pose: { torso: 270, armN: [345, 230], armF: [345, 230], legN: feet(258), legF: feet(250), root: { by: 'hip', at: [208, 220] } }, hold: 0.1, move: 0.9 },
    ],
  },
  leg_extension: {
    label: 'Beinstrecker',
    props: [{ type: 'block', x: 150, y: 250, w: 64, h: 14 }, { type: 'block', x: 118, y: 196, w: 14, h: 100 }, { type: 'anklepad' }],
    phases: [
      { pose: { torso: 352, armN: [170, 110], armF: [170, 110], legN: [92, 178, 92], legF: [92, 180, 94], root: { by: 'hip', at: [140, 234] } }, hold: 0.15, move: 1.0 },
      { pose: { torso: 352, armN: [170, 110], armF: [170, 110], legN: [92, 96, 10], legF: [92, 98, 12], root: { by: 'hip', at: [140, 234] } }, hold: 0.35, move: 1.0 },
    ],
  },
  leg_curl_lying: {
    label: 'Beinbeuger liegend',
    props: [{ type: 'bench', x: 168, y: 244, w: 210 }, { type: 'anklepad' }],
    phases: [
      { pose: { torso: 270, armN: [200, 270], armF: [200, 270], legN: [90, 92, 180], legF: [90, 94, 182], root: { by: 'hip', at: [190, 228] } }, hold: 0.15, move: 1.0 },
      { pose: { torso: 270, armN: [200, 270], armF: [200, 270], legN: [90, 345, 70], legF: [90, 347, 72], root: { by: 'hip', at: [190, 228] } }, hold: 0.3, move: 1.0 },
    ],
  },
  calf_raise: {
    label: 'Wadenheben',
    phases: [
      { pose: stand(), hold: 0.2, move: 0.7 },
      { pose: stand({ legN: { ik: [180, ANKLE_Y - 16], bend: 'fwd', foot: 128 }, legF: { ik: [180, ANKLE_Y - 16], bend: 'fwd', foot: 128 }, root: { by: 'hip', at: [X - 4, ANKLE_Y - 166] } }), hold: 0.4, move: 0.8 },
    ],
  },
  crunch: {
    label: 'Crunch',
    phases: [
      { pose: { torso: 272, armN: [110, 100], armF: [112, 102], legN: feet(262), legF: feet(258), root: { by: 'hip', at: [196, ANKLE_Y - 8] } }, hold: 0.15, move: 0.8 },
      { pose: { torso: 306, armN: [112, 100], armF: [114, 102], legN: feet(262), legF: feet(258), root: { by: 'hip', at: [196, ANKLE_Y - 8] } }, hold: 0.3, move: 0.8 },
    ],
  },
  leg_raise_hanging: {
    label: 'Hängendes Beinheben',
    floor: false,
    props: [{ type: 'bar', x: 150, y: 18 }],
    phases: [
      { pose: { torso: 0, armN: hands(150, 24, 'back'), armF: hands(150, 24, 'back'), legN: [180, 182, 150], legF: [182, 184, 152], root: { by: 'hip', at: [148, 200] } }, hold: 0.2, move: 1.0 },
      { pose: { torso: 352, armN: hands(150, 24, 'back'), armF: hands(150, 24, 'back'), legN: [92, 100, 30], legF: [94, 102, 32], root: { by: 'hip', at: [152, 196] } }, hold: 0.25, move: 1.1 },
    ],
  },
  leg_raise_lying: {
    label: 'Beinheben liegend',
    phases: [
      { pose: { torso: 270, armN: [92, 90], armF: [92, 90], legN: [92, 92, 0], legF: [94, 94, 2], root: { by: 'hip', at: [190, ANKLE_Y - 8] } }, hold: 0.15, move: 1.0 },
      { pose: { torso: 270, armN: [92, 90], armF: [92, 90], legN: [4, 6, 96], legF: [6, 8, 98], root: { by: 'hip', at: [190, ANKLE_Y - 8] } }, hold: 0.25, move: 1.1 },
    ],
  },
}
