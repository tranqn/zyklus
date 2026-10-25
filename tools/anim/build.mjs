// Builds the exercise animations with the EffectCraft CLI.
//
//   node tools/anim/build.mjs [pattern ...] [--frames]
//
// For each pattern: sample the motion, emit an After Effects-style script (shape layers with
// parenting and rotation keyframes), let `effectcraft-cli script` build the project, then
// export Lottie JSON into public/anim/<pattern>.json. --frames also renders PNG checks.

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PATTERNS } from './patterns.mjs'
import { aeRot, COLOR, COMP, HEAD_R, LEN, sample, WIDTH } from './rig.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../..')
const out = join(repo, 'public/anim')
const work = join(repo, 'tools/anim/.work')
const EC = process.env.EFFECTCRAFT_CLI ?? join(process.env.HOME, 'tools/effectcraft/effectcraft-cli-0.10.0-macos-universal/effectcraft-cli')

const args = process.argv.slice(2)
const wantFrames = args.includes('--frames')
const only = args.filter((a) => !a.startsWith('--'))

/** Keep successive angles continuous (no 179 -> -179 jumps between keys). */
function unwrap(values) {
  const res = [values[0]]
  for (let i = 1; i < values.length; i++) {
    let v = values[i]
    while (v - res[i - 1] > 180) v -= 360
    while (v - res[i - 1] < -180) v += 360
    res.push(v)
  }
  return res
}

const r2 = (n) => Math.round(n * 100) / 100
const js = (v) => JSON.stringify(v)

function emit(name, spec) {
  // spec.len shortens segments for foreshortened views (e.g. thighs pointing at the camera)
  const saved = { ...LEN }
  Object.assign(LEN, spec.len ?? {})
  try {
    return emitPattern(name, spec)
  } finally {
    Object.assign(LEN, saved)
  }
}

function emitPattern(name, spec) {
  const { frames, duration } = sample(spec.phases, spec.step ?? 0.1)
  const times = frames.map((f) => r2(f.t))
  const P = frames.map((f) => f.pose)

  // rotations relative to the parent layer (hip has no rotation)
  const rot = {
    torso: P.map((p) => aeRot(p.torso)),
    thighN: P.map((p) => aeRot(p.legN[0])),
    shinN: P.map((p) => p.legN[1] - p.legN[0]),
    footN: P.map((p) => p.legN[2] - p.legN[1]),
    thighF: P.map((p) => aeRot(p.legF[0])),
    shinF: P.map((p) => p.legF[1] - p.legF[0]),
    footF: P.map((p) => p.legF[2] - p.legF[1]),
    upperN: P.map((p) => p.armN[0] - p.torso),
    foreN: P.map((p) => p.armN[1] - p.armN[0]),
    upperF: P.map((p) => p.armF[0] - p.torso),
    foreF: P.map((p) => p.armF[1] - p.armF[0]),
    wrist: P.map((p) => p.wrist ?? 0),
  }
  for (const k of Object.keys(rot)) rot[k] = unwrap(rot[k]).map(r2)
  const hip = P.map((p) => [r2(p.root.at[0]), r2(p.root.at[1])])

  const props = spec.props ?? []
  const lines = []
  lines.push(`var comp = app.project.items.addComp(${js(name)}, ${COMP.w}, ${COMP.h}, 1, ${r2(duration)}, ${COMP.fps});`)
  lines.push(`var T = ${js(times)};`)
  lines.push(`
function shape(name) { var l = comp.layers.addShape(); l.name = name; l.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]); return l; }
function grp(l) { return l.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group"); }
function fill(g, c, o) { var f = g.addProperty("ADBE Vector Graphic - Fill"); f.property("ADBE Vector Fill Color").setValue(c); if (o != null) f.property("ADBE Vector Fill Opacity").setValue(o); }
function rect(g, w, h, x, y, round) { var r = g.addProperty("ADBE Vector Shape - Rect"); r.property("ADBE Vector Rect Size").setValue([w, h]); r.property("ADBE Vector Rect Position").setValue([x, y]); r.property("ADBE Vector Rect Roundness").setValue(round); }
function ellipse(g, d, x, y) { var e = g.addProperty("ADBE Vector Shape - Ellipse"); e.property("ADBE Vector Ellipse Size").setValue([d, d]); e.property("ADBE Vector Ellipse Position").setValue([x, y]); }
function tr(l) { return l.property("ADBE Transform Group"); }
/** capsule from the anchor (proximal joint) down to the distal joint */
function stroke(g, c, w) { var s = g.addProperty("ADBE Vector Graphic - Stroke"); s.property("ADBE Vector Stroke Color").setValue(c); s.property("ADBE Vector Stroke Width").setValue(w); }
function seg(name, len, w, c, parent, pos, outline) {
  var l = shape(name); var g = grp(l); rect(g, w, len + w, 0, len / 2, w / 2); fill(g, c); if (outline) stroke(g, outline, 2.5);
  tr(l).property("ADBE Anchor Point").setValue([0, 0]);
  if (parent) l.parent = parent;
  tr(l).property("ADBE Position").setValue(pos);
  return l;
}
function keys(l, values) { var p = tr(l).property("ADBE Rotate Z"); for (var i = 0; i < T.length; i++) p.setValueAtTime(T[i], values[i]); }
function disc(name, d, c, parent, pos) {
  var l = shape(name); var g = grp(l); ellipse(g, d, 0, 0); fill(g, c);
  if (parent) l.parent = parent;
  tr(l).property("ADBE Position").setValue(pos);
  return l;
}
`)

  // static scenery, back to front
  if (spec.floor !== false) lines.push(`var floor = shape("Boden"); var fg = grp(floor); rect(fg, 300, 3, 180, ${COMP.h - 38 + 1.5}, 1.5); fill(fg, ${js(COLOR.gear)}, 45);`)
  for (const p of props) {
    if (p.type === 'bench') lines.push(`var b = shape("Bank"); var bg = grp(b); rect(bg, ${p.w}, ${p.h ?? 10}, ${p.x}, ${p.y}, 4); fill(bg, ${js(COLOR.bench)}); ${p.legs === false ? '' : `rect(bg, 8, ${COMP.h - 38 - p.y}, ${p.x - p.w / 2 + 14}, ${(p.y + COMP.h - 38) / 2}, 2); rect(bg, 8, ${COMP.h - 38 - p.y}, ${p.x + p.w / 2 - 14}, ${(p.y + COMP.h - 38) / 2}, 2);`}`)
    if (p.type === 'block') lines.push(`var k = shape("Polster"); var kg = grp(k); rect(kg, ${p.w}, ${p.h}, ${p.x}, ${p.y}, 6); fill(kg, ${js(COLOR.bench)});`)
  }

  const far = js(COLOR.far)
  const near = js(COLOR.near)
  lines.push(`
var hip = disc("Hüfte", ${WIDTH.thigh + 4}, ${near}, null, ${js(hip[0])});
var pos = tr(hip).property("ADBE Position");
var H = ${js(hip)};
for (var i = 0; i < T.length; i++) pos.setValueAtTime(T[i], H[i]);

var thighF = seg("Oberschenkel hinten", ${LEN.thigh}, ${WIDTH.thigh}, ${far}, hip, [0, 0]); keys(thighF, ${js(rot.thighF)});
var shinF = seg("Unterschenkel hinten", ${LEN.shin}, ${WIDTH.shin}, ${far}, thighF, [0, ${LEN.thigh}]); keys(shinF, ${js(rot.shinF)});
var footF = seg("Fuß hinten", ${LEN.foot}, ${WIDTH.foot}, ${far}, shinF, [0, ${LEN.shin}]); keys(footF, ${js(rot.footF)});
var torso = seg("Rumpf", ${LEN.torso}, ${WIDTH.torso}, ${near}, hip, [0, 0]); keys(torso, ${js(rot.torso)});
var upperF = seg("Oberarm hinten", ${LEN.upperArm}, ${WIDTH.upperArm}, ${far}, torso, [0, ${LEN.torso}]); keys(upperF, ${js(rot.upperF)});
var foreF = seg("Unterarm hinten", ${LEN.forearm}, ${WIDTH.forearm}, ${far}, upperF, [0, ${LEN.upperArm}]); keys(foreF, ${js(rot.foreF)});
`)
  for (const p of props) {
    if (p.type === 'dumbbells') lines.push(`disc("Hantel hinten", ${p.d ?? 22}, ${js(COLOR.gear)}, foreF, [0, ${LEN.forearm + 2}]);`)
    if (p.type === 'wristdb') lines.push(`var handF = seg("Hand hinten", 14, 12, ${far}, foreF, [0, ${LEN.forearm}]); keys(handF, ${js(rot.wrist)}); disc("Hantel hinten", 20, ${js(COLOR.gear)}, handF, [0, 16]);`)
  }
  lines.push(`
var head = disc("Kopf", ${HEAD_R * 2}, ${near}, torso, [0, ${LEN.torso + LEN.neck}]);
var OL = ${js(COLOR.outline)};
var thighN = seg("Oberschenkel vorn", ${LEN.thigh}, ${WIDTH.thigh}, ${near}, hip, [0, 0], OL); keys(thighN, ${js(rot.thighN)});
var shinN = seg("Unterschenkel vorn", ${LEN.shin}, ${WIDTH.shin}, ${near}, thighN, [0, ${LEN.thigh}], OL); keys(shinN, ${js(rot.shinN)});
var footN = seg("Fuß vorn", ${LEN.foot}, ${WIDTH.foot}, ${near}, shinN, [0, ${LEN.shin}], OL); keys(footN, ${js(rot.footN)});
var upperN = seg("Oberarm vorn", ${LEN.upperArm}, ${WIDTH.upperArm}, ${near}, torso, [0, ${LEN.torso}], OL); keys(upperN, ${js(rot.upperN)});
var foreN = seg("Unterarm vorn", ${LEN.forearm}, ${WIDTH.forearm}, ${near}, upperN, [0, ${LEN.upperArm}], OL); keys(foreN, ${js(rot.foreN)});
`)
  for (const p of props) {
    // bars sit in front of the hands that grip them
    if (p.type === 'bar') lines.push(`var bar = shape("Stange"); var barg = grp(bar); rect(barg, 120, 8, ${p.x}, ${p.y}, 4); fill(barg, ${js(COLOR.gear)});`)
    if (p.type === 'plate') lines.push(`disc("Hantelscheibe", ${p.d ?? 52}, ${js(COLOR.gear)}, foreN, [0, ${LEN.forearm + 2}]);`)
    if (p.type === 'dumbbells') lines.push(`disc("Hantel vorn", ${p.d ?? 22}, ${js(COLOR.gear)}, foreN, [0, ${LEN.forearm + 2}]);`)
    if (p.type === 'wristdb') lines.push(`var handN = seg("Hand vorn", 14, 12, ${near}, foreN, [0, ${LEN.forearm}], OL); keys(handN, ${js(rot.wrist)}); disc("Hantel vorn", 20, ${js(COLOR.gear)}, handN, [0, 16]);`)
    if (p.type === 'backbar') lines.push(`disc("Hantelscheibe", 52, ${js(COLOR.gear)}, torso, [0, ${LEN.torso - 6}]);`)
    if (p.type === 'hipbar') lines.push(`disc("Hantelscheibe", 52, ${js(COLOR.gear)}, hip, [0, -20]);`)
    if (p.type === 'handle') lines.push(`disc("Griff", 14, ${js(COLOR.gear)}, foreN, [0, ${LEN.forearm + 2}]);`)
    if (p.type === 'kneepad') lines.push(`disc("Polster", 24, ${js(COLOR.gear)}, thighN, [0, ${LEN.thigh - 4}]);`)
    if (p.type === 'anklepad') lines.push(`disc("Polster", 22, ${js(COLOR.gear)}, shinN, [0, ${LEN.shin - 6}]);`)
    if (p.type === 'footplate') lines.push(`var fp = shape("Fußplatte"); var fpg = grp(fp); rect(fpg, 10, 64, 0, 0, 3); fill(fpg, ${js(COLOR.gear)}); fp.parent = footN; tr(fp).property("ADBE Position").setValue([0, ${LEN.foot / 2}]); tr(fp).property("ADBE Rotate Z").setValue(90);`)
  }
  lines.push(`writeLn("ok " + comp.numLayers + " layers, " + T.length + " keys");`)
  return { jsx: lines.join('\n'), duration }
}

mkdirSync(out, { recursive: true })
mkdirSync(work, { recursive: true })
const names = only.length ? only : Object.keys(PATTERNS)
const index = {}
for (const name of names) {
  const spec = PATTERNS[name]
  if (!spec) throw new Error(`unknown pattern ${name}`)
  const { jsx, duration } = emit(name, spec)
  const jsxPath = join(work, `${name}.jsx`)
  const proj = join(work, `${name}.ecproj`)
  const json = join(out, `${name}.json`)
  writeFileSync(jsxPath, jsx)
  const log = execFileSync(EC, ['script', jsxPath, '--empty', '--save-as', proj], { encoding: 'utf8' }).trim().split('\n')[0]
  execFileSync(EC, ['exec', 'file.exportLottie', '--params', JSON.stringify({ comp: name, path: json }), '--project', proj], { encoding: 'utf8' })
  if (wantFrames) {
    for (const t of [0, duration * 0.25, duration * 0.5]) {
      execFileSync(EC, ['render-frame', '--project', proj, '--comp', name, '--time', String(r2(t)), '--out', join(work, `${name}-${Math.round(t * 10)}.png`)], { encoding: 'utf8' })
    }
  }
  index[name] = { duration: r2(duration), label: spec.label }
  console.log(`${name}: ${log}`)
}
if (!only.length) writeFileSync(join(out, 'index.json'), JSON.stringify(index, null, 1))
