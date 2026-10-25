// Side-view stick figure rig and pose maths for the exercise animations.
//
// Authoring angles: 0 = up, 90 = forward (the figure faces right), 180 = down, 270 = back.
// Every segment points from its proximal joint to its distal joint.

export const COMP = { w: 360, h: 360, fps: 30 }
export const FLOOR_Y = 322

export const LEN = { torso: 92, neck: 20, upperArm: 56, forearm: 52, thigh: 78, shin: 74, foot: 26 }
export const WIDTH = { torso: 30, upperArm: 16, forearm: 14, thigh: 22, shin: 18, foot: 12 }
export const HEAD_R = 17

export const COLOR = {
  near: [1.0, 0.416, 0.2],
  far: [0.72, 0.27, 0.12],
  gear: [0.545, 0.576, 0.631],
  bench: [0.42, 0.45, 0.5],
  /** outline on near limbs so they stay visible in front of the torso */
  outline: [0.55, 0.17, 0.04],
}

const rad = (a) => (a * Math.PI) / 180
export const dir = (a) => [Math.sin(rad(a)), -Math.cos(rad(a))]
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k]

const angleOf = (v) => (Math.atan2(v[0], -v[1]) * 180) / Math.PI

/**
 * Two-joint IK: angles [a1, a2] so a limb from `start` reaches `target`.
 * bend 'fwd' puts the middle joint on the forward/counter-clockwise side of the line, 'back' on the other.
 */
export function ik(start, target, l1, l2, bend) {
  const v = [target[0] - start[0], target[1] - start[1]]
  const d = Math.min(Math.hypot(v[0], v[1]), l1 + l2 - 0.01)
  const cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
  const alpha = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
  const base = angleOf(v)
  const a1 = bend === 'fwd' ? base - alpha : base + alpha
  const mid = add(start, dir(a1), l1)
  return [a1, angleOf([target[0] - mid[0], target[1] - mid[1]])]
}

/** Resolve IK limbs ({ ik:[x,y], bend }) into angle arrays. Leaves angle arrays untouched. */
export function resolve(pose) {
  const hip = pose.root.at
  const shoulder = add(hip, dir(pose.torso), LEN.torso)
  const leg = (l) => (Array.isArray(l) ? l : [...ik(hip, l.ik, LEN.thigh, LEN.shin, l.bend ?? 'fwd'), l.foot ?? 90])
  const arm = (a) => (Array.isArray(a) ? a : ik(shoulder, a.ik, LEN.upperArm, LEN.forearm, a.bend ?? 'back'))
  return { ...pose, root: { by: 'hip', at: hip }, legN: leg(pose.legN), legF: leg(pose.legF), armN: arm(pose.armN), armF: arm(pose.armF) }
}

/** AE rotation of a rectangle that hangs straight down from its anchor. */
export const aeRot = (a) => a - 180

/**
 * Joint positions in comp space for a pose.
 * pose: { torso, armN:[up,fore], armF, legN:[thigh,shin,foot], legF, root }
 * root: { at:[x,y], by:'hip'|'ankleN'|'ankleF'|'handN'|'shoulder' }
 */
export function joints(pose) {
  const { torso, armN, armF, legN, legF, root } = pose
  let hip
  if (root.by === 'hip') hip = root.at
  else if (root.by === 'ankleN' || root.by === 'ankleF') {
    const leg = root.by === 'ankleN' ? legN : legF
    const knee = add(root.at, dir(leg[1]), -LEN.shin)
    hip = add(knee, dir(leg[0]), -LEN.thigh)
  } else if (root.by === 'handN') {
    const elbow = add(root.at, dir(armN[1]), -LEN.forearm)
    const shoulder = add(elbow, dir(armN[0]), -LEN.upperArm)
    hip = add(shoulder, dir(torso), -LEN.torso)
  } else if (root.by === 'shoulder') {
    hip = add(root.at, dir(torso), -LEN.torso)
  } else throw new Error(`unknown root ${root.by}`)
  const shoulder = add(hip, dir(torso), LEN.torso)
  const limb = (start, a1, l1, a2, l2) => {
    const mid = add(start, dir(a1), l1)
    return [mid, add(mid, dir(a2), l2)]
  }
  const [elbowN, handN] = limb(shoulder, armN[0], LEN.upperArm, armN[1], LEN.forearm)
  const [elbowF, handF] = limb(shoulder, armF[0], LEN.upperArm, armF[1], LEN.forearm)
  const [kneeN, ankleN] = limb(hip, legN[0], LEN.thigh, legN[1], LEN.shin)
  const [kneeF, ankleF] = limb(hip, legF[0], LEN.thigh, legF[1], LEN.shin)
  return { hip, shoulder, elbowN, handN, elbowF, handF, kneeN, ankleN, kneeF, ankleF }
}

const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t)
const lerp = (a, b, t) => a + (b - a) * t
const lerpAngle = (a, b, t) => {
  let d = ((b - a + 540) % 360) - 180
  return a + d * t
}

function mixPose(p, q, t) {
  const arr = (x, y) => {
    if (Array.isArray(x) && Array.isArray(y)) return x.map((v, i) => lerpAngle(v, y[i], t))
    if (!Array.isArray(x) && !Array.isArray(y)) return { ...x, ik: [lerp(x.ik[0], y.ik[0], t), lerp(x.ik[1], y.ik[1], t)], foot: lerpAngle(x.foot ?? 90, y.foot ?? 90, t) }
    throw new Error('cannot mix an IK limb with an angle limb')
  }
  return {
    torso: lerpAngle(p.torso, q.torso, t),
    armN: arr(p.armN, q.armN),
    armF: arr(p.armF, q.armF),
    legN: arr(p.legN, q.legN),
    legF: arr(p.legF, q.legF),
    root: { by: p.root.by, at: [lerp(p.root.at[0], q.root.at[0], t), lerp(p.root.at[1], q.root.at[1], t)] },
    // hand angle relative to the forearm (only drawn with the wristdb prop)
    wrist: lerp(p.wrist ?? 0, q.wrist ?? 0, t),
  }
}

/**
 * Sample a looping motion. phases: [{ pose, hold?: seconds }, ...] plus durations between them.
 * Returns [{ t, pose }] including the final frame equal to the first.
 */
export function sample(phases, step = 0.1) {
  const out = []
  let t = 0
  for (let i = 0; i < phases.length; i++) {
    const cur = phases[i]
    const next = phases[(i + 1) % phases.length]
    if (cur.hold) {
      out.push({ t, pose: resolve(cur.pose) })
      t += cur.hold
    }
    const n = Math.max(2, Math.round(cur.move / step))
    for (let k = 0; k < n; k++) out.push({ t: t + (cur.move * k) / n, pose: resolve(mixPose(cur.pose, next.pose, ease(k / n))) })
    t += cur.move
  }
  out.push({ t, pose: resolve(phases[0].pose) })
  return { frames: out, duration: t }
}
