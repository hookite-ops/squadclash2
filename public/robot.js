// SQUAD CLASH 2 — 휴머노이드 로봇 몸 (RX-7 전신형)
// Blender 로 만든 assets/robot.glb (부위·재질별 메시, 서 있는 기본 자세)를 불러와 뼈(THREE.Bone) 하나에 부위 하나씩 붙인 SkinnedMesh 로 만든다.
// 뼈 이름·자리는 전작 avatar.js 의 뼈대(hips → spine → head·arms → 팔 토막, hips → thigh → knee)와 같아서 동작 코드를 그대로 쓴다.
// 흰 장갑에는 그림(paint.js 의 256×256 앞·뒤 그림)이 입혀지고, 빛나는 줄은 팀 색, 뼈대·관절은 어두운 금속, 바이저는 검은 유리.
// 가까이는 4.4만 삼각형, 17m 넘게 멀어지면 1.7만 삼각형 모델로 바뀐다 (LOD). 로봇 하나 = 그리기 4번.
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { dollUV } from './paint.js';
import { gunEnv } from './guns.js';

// 관절 치수 (m): 위팔 0.30, 팔꿈치 → 쥔 손 가운데 0.363, 허벅지·정강이 0.38, 어깨 ±0.235 (팔 묶음 기준 높이 +0.06), 엉덩이 ±0.105
export const RB = { UA: 0.3, FA: 0.363, TH: 0.38, SHIN: 0.38, SHO_X: 0.235, SHO_Y: 0.06, LEG_X: 0.105 };
const BONES = ['hips', 'spine', 'head', 'arms', 'upR', 'foreR', 'upL', 'foreL', 'thighL', 'kneeL', 'thighR', 'kneeR'];
const PARENT = { hips: null, spine: 'hips', head: 'spine', arms: 'spine', upR: 'arms', foreR: 'arms', upL: 'arms', foreL: 'arms', thighL: 'hips', kneeL: 'thighL', thighR: 'hips', kneeR: 'thighR' };
// 기본 자세에서 뼈의 자리 (부모 기준) — 전작 buildBody 와 같은 구조
const LOCAL = { hips: [0, 0.76, 0], spine: [0, 0, 0], head: [0, 0.68, 0], arms: [0, 0.56, 0], upR: [RB.SHO_X, RB.SHO_Y, 0], foreR: [RB.SHO_X, RB.SHO_Y - RB.UA, 0], upL: [-RB.SHO_X, RB.SHO_Y, 0], foreL: [-RB.SHO_X, RB.SHO_Y - RB.UA, 0], thighL: [-RB.LEG_X, 0, 0], kneeL: [0, -RB.TH, 0], thighR: [RB.LEG_X, 0, 0], kneeR: [0, -RB.TH, 0] };
const SEG_BONE = { head: 'head', torso: 'spine', pelvis: 'hips', upR: 'upR', foreR: 'foreR', handR: 'foreR', upL: 'upL', foreL: 'foreL', handL: 'foreL', thighR: 'thighR', shinR: 'kneeR', thighL: 'thighL', shinL: 'kneeL' };
// 그림 자리: 로봇 부위 묶음의 크기를 전작 인형의 그림 칸(머리·몸통·팔·다리)에 맞춰 늘림 → 요원 스킨·봇 도색·그린 그림이 그대로 맞는다
const PAINT_GROUP = { head: 'head', torso: 'body', pelvis: 'body', upR: 'armR', foreR: 'armR', handR: 'armR', upL: 'armL', foreL: 'armL', handL: 'armL', thighR: 'legR', shinR: 'legR', thighL: 'legL', shinL: 'legL' };
const DST = { head: [-0.205, 1.44, 0.205, 1.82], body: [-0.24, 0.72, 0.24, 1.44], armR: [0.24, 0.76, 0.475, 1.44], armL: [-0.475, 0.76, -0.24, 1.44], legR: [0, 0, 0.24, 0.76], legL: [-0.24, 0, 0, 0.76] };
// 요원 스킨의 3D 장식(전작 인형 치수로 만든 것)을 로봇 크기에 맞추는 뼈별 자리·배율
export const FIT_OP = {
  head: { p: [0, 0.043, 0], s: [0.61, 0.72, 0.58] }, spine: { p: [0, 0.072, -0.018], s: [0.85, 0.9, 1.18] }, hips: { p: [0, 0, 0], s: [0.75, 1, 0.85] },
  up: { p: [0, 0, 0], s: [0.6, 0.83, 0.67] }, fore: { p: [0, 0, 0], s: [0.56, 0.76, 0.56] }, thigh: { p: [0, 0, 0], s: [0.69, 1, 0.69] }, knee: { p: [0, 0, 0], s: [0.68, 1, 0.68] },
};

const BS = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.3), IDENT = new THREE.Matrix4();
const REST_INV = (() => { // 뼈마다 기본 자세의 (몸 기준) 자리의 역행렬
  const W = {}, out = [];
  for (const n of BONES) { const p = LOCAL[n], q = PARENT[n] ? W[PARENT[n]] : [0, 0, 0]; W[n] = [p[0] + q[0], p[1] + q[1], p[2] + q[2]]; out.push(new THREE.Matrix4().makeTranslation(-W[n][0], -W[n][1], -W[n][2])); }
  return out;
})();

// ── 불러오기 ──
let SRC = null, LOADING = null;
const PENDING = new Set();
export const robotReady = () => !!SRC;
export function loadRobot() {
  if (LOADING) return LOADING;
  const ld = new GLTFLoader();
  LOADING = Promise.all([ld.loadAsync('assets/robot.glb'), ld.loadAsync('assets/robot_lo.glb')]).then(([hi, lo]) => {
    SRC = { hi: buildSet(hi.scene), lo: buildSet(lo.scene) };
    for (const r of PENDING) fill(r);
    PENDING.clear();
  }).catch((e) => { console.warn('로봇 모델을 못 불러옴', e); LOADING = null; });
  return LOADING;
}

// 부위·재질별 메시 → 재질 종류마다 하나로 합친 뼈대 메시 자료 (모든 로봇이 같이 씀)
function buildSet(root) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const [seg, mn] = o.name.split('__'), bone = BONES.indexOf(SEG_BONE[seg]);
    if (bone < 0 || !mn) return;
    const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    const kind = mn.endsWith('armor') ? 'armor' : mn.endsWith('glow') ? 'glow' : mn.endsWith('visor') ? 'visor' : 'mech';
    parts.push({ seg, g, bone, kind, col: o.material && o.material.color ? o.material.color.clone() : new THREE.Color(0.15, 0.16, 0.18) });
  });
  // 그림 묶음마다 크기 (재질 상관없이 전부)
  const box = {};
  for (const p of parts) {
    const k = PAINT_GROUP[p.seg], b = box[k] || (box[k] = [1e9, 1e9, -1e9, -1e9]), a = p.g.attributes.position;
    for (let i = 0; i < a.count; i++) { const x = a.getX(i), y = a.getY(i); if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
  }
  const out = {};
  for (const kind of ['armor', 'mech', 'visor', 'glow']) {
    const list = parts.filter((p) => p.kind === kind);
    if (list.length) out[kind] = kind === 'armor' ? mergeArmor(list, box) : mergeIndexed(list, kind === 'mech');
  }
  return out;
}
function skinAttrs(geo, idx) {
  const n = geo.attributes.position.count, si = new Uint8Array(n * 4), sw = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) { si[i * 4] = idx[i]; sw[i * 4] = 255; }
  geo.setAttribute('skinIndex', new THREE.Uint8BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Uint8BufferAttribute(sw, 4, true));
}
function mergeIndexed(list, withColor) {
  let nv = 0, ni = 0;
  for (const p of list) { nv += p.g.attributes.position.count; ni += p.g.index ? p.g.index.count : p.g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = withColor ? new Float32Array(nv * 3) : null, bone = new Uint8Array(nv), index = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const p of list) {
    const a = p.g.attributes.position, n = p.g.attributes.normal, c = a.count;
    for (let i = 0; i < c; i++) {
      pos.set([a.getX(i), a.getY(i), a.getZ(i)], (ov + i) * 3);
      if (n) nor.set([n.getX(i), n.getY(i), n.getZ(i)], (ov + i) * 3);
      if (col) col.set([p.col.r, p.col.g, p.col.b], (ov + i) * 3);
      bone[ov + i] = p.bone;
    }
    if (p.g.index) { const ix = p.g.index; for (let i = 0; i < ix.count; i++) index[oi + i] = ix.getX(i) + ov; oi += ix.count; }
    else { for (let i = 0; i < c; i++) index[oi + i] = ov + i; oi += c; }
    ov += c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1)); skinAttrs(g, bone);
  g.boundingSphere = BS.clone();
  return g;
}
// 흰 장갑: 삼각형마다 앞·뒤를 정해 그림 자리를 매김 (그래서 꼭짓점을 나눠 가짐)
function mergeArmor(list, box) {
  let nt = 0;
  for (const p of list) nt += (p.g.index ? p.g.index.count : p.g.attributes.position.count) / 3;
  const pos = new Float32Array(nt * 9), nor = new Float32Array(nt * 9), uv = new Float32Array(nt * 6), bone = new Uint8Array(nt * 3);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
  let t = 0;
  for (const p of list) {
    const a = p.g.attributes.position, n = p.g.attributes.normal, ix = p.g.index, cnt = ix ? ix.count : a.count;
    const gk = PAINT_GROUP[p.seg], s = box[gk], d = DST[gk];
    const mx = (x) => Math.min(d[2] - 0.012, Math.max(d[0] + 0.012, d[0] + ((x - s[0]) / (s[2] - s[0] || 1)) * (d[2] - d[0])));
    const my = (y) => Math.min(d[3] - 0.008, Math.max(d[1] + 0.008, d[1] + ((y - s[1]) / (s[3] - s[1] || 1)) * (d[3] - d[1])));
    for (let i = 0; i < cnt; i += 3, t++) {
      const i0 = ix ? ix.getX(i) : i, i1 = ix ? ix.getX(i + 1) : i + 1, i2 = ix ? ix.getX(i + 2) : i + 2;
      A.fromBufferAttribute(a, i0); B.fromBufferAttribute(a, i1); C.fromBufferAttribute(a, i2);
      N.subVectors(B, A).cross(C.clone().sub(A)).normalize(); // 면 방향: 뒤(+z)를 보는 면만 뒤 그림, 옆·위·아래는 앞 그림의 가장자리 색
      const back = N.z > 0.1;
      [i0, i1, i2].forEach((vi, k) => {
        const o = t * 3 + k;
        pos[o * 3] = a.getX(vi); pos[o * 3 + 1] = a.getY(vi); pos[o * 3 + 2] = a.getZ(vi);
        if (n) { nor[o * 3] = n.getX(vi); nor[o * 3 + 1] = n.getY(vi); nor[o * 3 + 2] = n.getZ(vi); }
        const q = dollUV(mx(a.getX(vi)), my(a.getY(vi)), !back); uv[o * 2] = q[0]; uv[o * 2 + 1] = q[1];
        bone[o] = p.bone;
      });
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  skinAttrs(g, bone); g.boundingSphere = BS.clone();
  return g;
}

// ── 재질 ──
const GLOW = new WeakMap();
function glowOf(bandMat) {
  let m = GLOW.get(bandMat);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: bandMat && bandMat.color ? bandMat.color.clone().multiplyScalar(1.25) : new THREE.Color(0x38bdf8) }); GLOW.set(bandMat, m); }
  return m;
}
let VISOR = null;
function visorMat() {
  if (!VISOR) VISOR = new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.1, metalness: 0.45, envMap: gunEnv(), envMapIntensity: 1.1 });
  return VISOR;
}

// ── 몸 만들기: 뼈는 바로, 메시는 모델을 받으면 붙음 ──
// 돌려주는 것: body(발밑) · hips · spine · head · arms · legs[0 왼 1 오른]{thigh, knee} · armR/armL{up, fore} · mat(그림 재질) · mats(윤곽광을 받을 재질들)
export function buildRobot(tex, bandMat) {
  const body = new THREE.Group(), bones = {};
  for (const n of BONES) { const b = new THREE.Bone(); b.name = n; b.position.fromArray(LOCAL[n]); bones[n] = b; (PARENT[n] ? bones[PARENT[n]] : body).add(b); }
  bones.head.rotation.order = 'YXZ'; bones.arms.rotation.order = 'YXZ';
  const env = gunEnv();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.46, metalness: 0.04, envMap: env, envMapIntensity: 0.45 });
  const mech = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.55, envMap: env, envMapIntensity: 0.6 });
  const lod = new THREE.LOD(); body.add(lod);
  const r = {
    body, hips: bones.hips, spine: bones.spine, head: bones.head, arms: bones.arms,
    legs: [{ thigh: bones.thighL, knee: bones.kneeL }, { thigh: bones.thighR, knee: bones.kneeR }],
    armR: { up: bones.upR, fore: bones.foreR }, armL: { up: bones.upL, fore: bones.foreL },
    mat, mech, mats: [mat, mech], glow: glowOf(bandMat), lod, fitOp: FIT_OP,
    skeleton: new THREE.Skeleton(BONES.map((n) => bones[n]), REST_INV.map((m) => m.clone())),
  };
  if (SRC) fill(r); else { PENDING.add(r); loadRobot(); }
  return r;
}
function fill(r) {
  for (const [lvl, dist] of [['hi', 0], ['lo', 17]]) {
    const S = SRC[lvl], grp = new THREE.Group();
    const add = (geo, m) => { if (!geo) return; const sm = new THREE.SkinnedMesh(geo, m); sm.bind(r.skeleton, IDENT); sm.boundingSphere = BS; grp.add(sm); };
    add(S.armor, r.mat); add(S.mech, r.mech); add(S.visor, visorMat()); add(S.glow, r.glow);
    r.lod.addLevel(grp, dist);
  }
}
