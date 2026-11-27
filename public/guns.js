// SQUAD CLASH 2 — 무기 모델: 무기고 19 의 GLB(로봇 팔 + 총, 손·동작 포함)를 불러와 1인칭(fpv.js)·3인칭·무기고에 쓴다.
// 스킨은 총 재질(이름이 _mat 으로 끝남) 위에 셰이더로 무늬·빛을 입힌다. 스킨마다 재질을 따로 만들어 사람마다 다른 스킨이 보인다.
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from './vendor/addons/environments/RoomEnvironment.js';
import { WEAPONS, SKINS } from './shared.js';
import { loadParts, fitParts, planOf, noteRest, partsReady, restRel, unfit } from './attach.js';

// 모델마다 잰 값 (총 뼈 'root' 기준, x 오른쪽 · y 총구 방향 · z 위): 오른손·왼손 손바닥, 총구, 조준점(가늠쇠·도트·조준경 렌즈), 크기
export const FIT = {"hx9":{"grip":[0.0309,-0.0013,0.0015],"fore":[-0.0619,0.0072,-0.0122],"muzzle":[0,0.178,0.063],"sight":[-0.0,0.0649,0.0822],"min":[-0.0186,-0.0362,-0.0745],"max":[0.0186,0.178,0.0856],"sk":"trit_front"},"swarm":{"grip":[0.0309,-0.0013,0.0015],"fore":[-0.0619,0.0072,-0.0122],"muzzle":[0,0.235,0.063],"sight":[0,0.1038,0.0825],"min":[-0.0199,-0.0362,-0.1245],"max":[0.0181,0.2352,0.0857],"sk":"front_trit"},"whisper":{"grip":[0.0309,-0.0013,0.0015],"fore":[-0.0619,0.0072,-0.0122],"muzzle":[0,0.3181,0.062],"sight":[-0.0,0.0708,0.0815],"min":[-0.0199,-0.0362,-0.0745],"max":[0.0199,0.3182,0.0845],"sk":"front_trit"},"wasp":{"grip":[0.0329,-0.0013,0.0014],"fore":[-0.0189,0.129,-0.0272],"muzzle":[0,0.28,0.0581],"sight":[-0.0,0.1647,0.1065],"min":[-0.025,-0.1985,-0.1065],"max":[0.0242,0.2805,0.1092],"sk":"front_trit"},"mist":{"grip":[0.0329,-0.0013,0.0014],"fore":[-0.0259,0.116,-0.0092],"muzzle":[0,0.3359,0.0601],"sight":[-0.0,0.0326,0.113],"min":[-0.0298,-0.2456,-0.1085],"max":[0.0298,0.3366,0.1291],"sk":"dot_lens"},"hammer":{"grip":[0.0329,-0.0013,0.0014],"fore":[0.0019,0.2825,0.0135],"muzzle":[-0.0,0.5742,0.0698],"sight":null,"min":[-0.0391,-0.2516,-0.0678],"max":[0.0278,0.5743,0.1058],"sk":""},"tempest":{"grip":[0.0329,-0.0013,0.0014],"fore":[-0.0189,0.2771,-0.0152],"muzzle":[-0.0,0.4199,0.062],"sight":[-0.0,0.0126,0.117],"min":[-0.0326,-0.2376,-0.087],"max":[0.0326,0.42,0.1332],"sk":"dot_lens"},"sentinel":{"grip":[0.0329,-0.0013,0.0014],"fore":[0.0013,0.2625,0.0323],"muzzle":[0,0.6499,0.062],"sight":[-0.0,0.05,0.118],"min":[-0.0336,-0.2777,-0.0985],"max":[0.0361,0.6507,0.146],"sk":"lens_f"},"nightfall":{"grip":[0.0329,-0.0013,0.0014],"fore":[0.0007,0.2525,0.0331],"muzzle":[0,0.606,0.062],"sight":[-0.0,0.0026,0.115],"min":[-0.0283,-0.2456,-0.1032],"max":[0.0318,0.606,0.1314],"sk":"dot_lens"},"titan":{"grip":[0.0329,-0.0013,0.0014],"fore":[0.0047,0.2825,0.0284],"muzzle":[-0.0,0.5942,0.062],"sight":[-0.0,0.4242,0.1145],"min":[-0.0297,-0.2556,-0.1032],"max":[0.0296,0.5946,0.1177],"sk":"front_trit"},"falcon":{"grip":[0.0329,-0.0013,0.0014],"fore":[-0.0001,0.2825,0.0344],"muzzle":[0,0.7002,0.062],"sight":[-0.0,0.051,0.12],"min":[-0.0705,-0.2782,-0.0985],"max":[0.0705,0.7002,0.149],"sk":"lens_f"},"rail":{"grip":[0.0329,-0.0013,0.0014],"fore":[0.0076,0.3025,0.0253],"muzzle":[-0.0,0.8682,0.064],"sight":[-0.0,0.058,0.132],"min":[-0.0405,-0.2817,-0.0985],"max":[0.053,0.8682,0.1634],"sk":"lens_f"},"storm":{"grip":[0.0329,-0.0013,0.0014],"fore":[-0.0189,0.3591,-0.0172],"muzzle":[0,0.6362,0.064],"sight":[-0.0,0.4837,0.105],"min":[-0.0345,-0.2676,-0.0889],"max":[0.0337,0.6544,0.1299],"sk":"front_trit"},"blitz":{"grip":[0.0329,-0.0013,0.0014],"fore":[-0.0199,0.3791,-0.0222],"muzzle":[-0.0,0.6641,0.0659],"sight":[-0.0,-0.0074,0.129],"min":[-0.041,-0.2778,-0.1132],"max":[0.041,0.6641,0.1458],"sk":"dot_lens"},"razor":{"grip":[0.0308,-0.0013,0.0015],"fore":[0.0308,-0.0013,0.0015],"muzzle":[0,0.272,0.0449],"sight":null,"min":[-0.0194,-0.0208,-0.0819],"max":[0.0194,0.2842,0.0631],"sk":""},"punk":{"grip":[0.0309,-0.0013,0.0015],"fore":[-0.0619,0.0072,-0.0122],"muzzle":[0,0.25,0.0591],"sight":[0,0.228,0.087],"min":[-0.0217,-0.034,-0.0746],"max":[0.0217,0.2503,0.0871],"sk":"front_trit"},"highnoon":{"grip":[0.0309,-0.0013,0.0015],"fore":[-0.0619,0.0072,-0.0122],"muzzle":[0,0.236,0.0601],"sight":[0,0.1173,0.0885],"min":[-0.021,-0.03,-0.0736],"max":[0.021,0.236,0.0948],"sk":"front_trit"},"hail":{"grip":[0.0329,-0.0013,0.0014],"fore":[0.003,0.3425,0.0419],"muzzle":[0,0.6069,0.0742],"sight":[0,0.2409,0.128],"min":[-0.0343,-0.3287,-0.1334],"max":[0.0343,0.6077,0.1509],"sk":"trit_front"}};
// 총 기준 → 3인칭 총 묶음 기준 (총구가 -Z, 위가 +Y)
const toG = (v) => (v ? [v[0], v[2], -v[1]] : null);

// ── 불러오기 ─────────────────────────────────────────────
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const cache = {}, loading = {};
let ENV = null;
export function initGunEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  ENV = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  for (const k in cache) envOf(cache[k].scene);
  loadParts(() => ENV).catch(() => {}); // 파츠 모델도 같은 반사 환경으로 (작아서 바로 받아 둠)
}
export const gunEnv = () => ENV; // 로봇 몸(robot.js)도 같은 반사 환경을 씀
function envOf(root) { root.traverse((o) => { if (o.isMesh && o.material) for (const m of [].concat(o.material)) { if (ENV && m.isMeshStandardMaterial) { m.envMap = ENV; m.envMapIntensity = 0.85; m.needsUpdate = true; } } }); }
export function loadModel(id) {
  if (cache[id]) return Promise.resolve(cache[id]);
  if (loading[id]) return loading[id];
  loading[id] = loader.loadAsync(`assets/vm/${id}.glb`).then((g) => {
    const scene = g.scene;
    scene.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; } });
    envOf(scene);
    const clips = {}; for (const c of g.animations) clips[c.name] = c;
    // 3인칭·무기고용 총은 동작이 묻기 전의 원본(root 아래 부품만)에서 복제
    const src = FIT[id] && FIT[id].knife ? scene : scene.getObjectByName('root');
    if (src) noteRest(src); // 쉬는 자세 기록 (파츠를 뼈에 붙일 때 씀)
    const pristine = src ? src.clone(true) : new THREE.Group();
    cache[id] = { scene, clips, pristine };
    return cache[id];
  }).catch((e) => { console.warn('무기 모델을 못 불러옴', id, e); delete loading[id]; throw e; });
  return loading[id];
}
export const modelReady = (id) => !!cache[id];
export function preloadGuns(ids) { // 차례로 받아 둠 (한꺼번에 받으면 첫 화면이 늦어짐)
  let p = Promise.resolve();
  for (const id of ids) p = p.then(() => loadModel(id).catch(() => {}));
  return p;
}

// ── 스킨 ─────────────────────────────────────────────────
// mode: 0 그대로 1 색 2 위장 3 줄무늬 4 카본 5 은하 6 그라데이션 · glow: 0 없음 1 회로 2 균열 3 맥동
const c = (r, g, b) => [r, g, b];
const SKDEF = {
  std: { mode: 0 },
  desert: { mode: 2, a: c(0.78, 0.66, 0.46), b: c(0.6, 0.5, 0.33), c: c(0.44, 0.36, 0.24), s: 38 },
  forest: { mode: 2, a: c(0.34, 0.42, 0.26), b: c(0.2, 0.26, 0.16), c: c(0.44, 0.37, 0.25), s: 34 },
  urban: { mode: 2, a: c(0.62, 0.64, 0.68), b: c(0.36, 0.38, 0.42), c: c(0.18, 0.19, 0.22), s: 40 },
  carbon: { mode: 4, a: c(0.07, 0.07, 0.08), b: c(0.17, 0.17, 0.19), s: 160, metal: 0.45, rough: 0.32, glow: 1, g: c(1, 0.12, 0.15), gi: 1.2, gs: 22 },
  tiger: { mode: 3, a: c(0.98, 0.52, 0.1), b: c(0.05, 0.04, 0.035), s: 55 },
  sakura: { mode: 2, a: c(1, 0.84, 0.9), b: c(0.96, 0.55, 0.72), c: c(1, 1, 1), s: 30 },
  ice: { mode: 6, a: c(0.62, 0.86, 1), b: c(0.92, 0.98, 1), s: 18, metal: 0.25, rough: 0.12, glow: 2, g: c(0.5, 0.85, 1), gi: 1.4, gs: 26 },
  neon: { mode: 1, a: c(0.07, 0.08, 0.11), metal: 0.5, rough: 0.3, glow: 1, g: c(0.15, 0.95, 1), gi: 2.6, gs: 30 },
  lava: { mode: 1, a: c(0.09, 0.06, 0.05), rough: 0.6, glow: 2, g: c(1, 0.42, 0.06), gi: 3.2, gs: 22 },
  gold: { mode: 1, a: c(1, 0.77, 0.32), metal: 1, rough: 0.2 },
  galaxy: { mode: 5, a: c(0.1, 0.04, 0.22), b: c(0.42, 0.12, 0.62), s: 26, glow: 3, g: c(0.6, 0.35, 1), gi: 0.25 },
  aurora: { mode: 6, a: c(0.15, 0.9, 0.68), b: c(0.52, 0.3, 1), s: 14, metal: 0.4, rough: 0.25 },
  halloween: { mode: 3, a: c(1, 0.46, 0.04), b: c(0.07, 0.03, 0.09), s: 48, glow: 2, g: c(0.7, 0.2, 1), gi: 1.6, gs: 16 },
  platinum: { mode: 1, a: c(0.9, 0.93, 0.98), metal: 1, rough: 0.13, glow: 1, g: c(0.85, 0.95, 1), gi: 1.2, gs: 18 },
  damascus: { mode: 3, a: c(0.62, 0.63, 0.68), b: c(0.26, 0.27, 0.31), s: 140, metal: 0.9, rough: 0.28 },
  obsidian: { mode: 1, a: c(0.04, 0.04, 0.05), metal: 0.5, rough: 0.08, glow: 2, g: c(0.62, 0.2, 1), gi: 2.4, gs: 24 },
  diamond: { mode: 5, a: c(0.78, 0.9, 1), b: c(0.95, 0.98, 1), s: 40, metal: 0.55, rough: 0.05 },
  atomic: { mode: 1, a: c(0.09, 0.16, 0.09), metal: 0.6, rough: 0.35, glow: 1, g: c(0.35, 1, 0.3), gi: 2.6, gs: 26 },
  orion: { mode: 5, a: c(0.04, 0.07, 0.2), b: c(0.12, 0.3, 0.7), s: 30, glow: 3, g: c(0.3, 0.6, 1), gi: 0.6 },
  darkmatter: { mode: 5, a: c(0.02, 0.015, 0.04), b: c(0.18, 0.05, 0.3), s: 22, glow: 3, g: c(0.55, 0.1, 1), gi: 1.6 },
  crimson: { mode: 1, a: c(0.72, 0.07, 0.09), metal: 0.65, rough: 0.28, glow: 1, g: c(1, 0.45, 0.2), gi: 2.4, gs: 20 },
  dragon: { mode: 3, a: c(0.1, 0.1, 0.11), b: c(0.03, 0.03, 0.035), s: 90, metal: 0.7, rough: 0.3, glow: 2, g: c(1, 0.15, 0.08), gi: 2.8, gs: 20 },
  phoenix: { mode: 6, a: c(1, 0.78, 0.25), b: c(0.95, 0.18, 0.08), s: 12, metal: 0.85, rough: 0.22, glow: 2, g: c(1, 0.6, 0.1), gi: 2.2, gs: 18 },
  aqua: { mode: 1, a: c(0.16, 0.66, 0.84), metal: 0.55, rough: 0.25, glow: 1, g: c(0.4, 1, 1), gi: 2.4, gs: 24 },
};
const GLSL = `
uniform int uMode; uniform int uGlow; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uG; uniform float uS; uniform float uGS; uniform float uGI; uniform float uT; uniform float uPulse;
varying vec3 vSkinP;
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 skinCol(vec3 base, vec3 p){
  float L = dot(base, vec3(0.299, 0.587, 0.114)); float k = 0.35 + 0.95 * L; vec3 col = base;
  if (uMode == 1) col = uA;
  else if (uMode == 2) { vec3 q = floor(p * uS * 0.5) / (uS * 0.5); float a = n3(q * uS * 0.25), b = n3(q * uS * 0.5 + 7.0); col = a > 0.62 ? uC : (b > 0.5 ? uB : uA); }
  else if (uMode == 3) { float s = sin(p.x * uS + n3(p * uS * 0.12) * 5.0 + p.y * uS * 0.3); col = mix(uA, uB, smoothstep(0.35, 0.6, s)); }
  else if (uMode == 4) { vec2 g = fract(p.xy * uS); float w = step(0.5, g.x) == step(0.5, g.y) ? 1.0 : 0.0; col = mix(uA, uB, w * (0.6 + 0.4 * sin(g.x * 6.28))); }
  else if (uMode == 5) { float nb = n3(p * uS * 0.3) * 0.7 + n3(p * uS) * 0.3; col = mix(uA, uB, smoothstep(0.35, 0.8, nb)); float st = h3(floor(p * uS * 6.0)); col += vec3(step(0.992, st)) * 1.4; }
  else if (uMode == 6) { float t = sin(p.y * uS + p.x * uS * 0.6 + n3(p * 9.0) * 1.5) * 0.5 + 0.5; col = mix(uA, uB, t); }
  if (uMode > 0) col *= k;
  return col; }
vec3 skinGlow(vec3 p){
  vec3 g0 = vec3(0.0);
  if (uGlow == 1) { vec3 g = abs(fract(p * uGS) - 0.5); float line = step(0.46, max(g.x, g.z)) * step(0.5, n3(floor(p * uGS) + 3.0)); g0 = uG * uGI * line * (0.75 + 0.25 * sin(uT * 3.0 + p.x * 40.0)); }
  else if (uGlow == 2) { float r = abs(n3(p * uGS) - 0.5) * 2.0; g0 = uG * uGI * smoothstep(0.12, 0.0, r) * (0.8 + 0.2 * sin(uT * 2.0 + p.y * 30.0)); }
  else if (uGlow == 3) { g0 = uG * uGI * (0.35 + 0.35 * sin(uT * 2.2 + p.x * 12.0 + p.y * 8.0)); }
  return g0 * (1.0 + uPulse * 1.6); }
`;
const T = { value: 0 }, PULSE = { value: 0 };
const UNI = [];
function uniformsOf(si) {
  if (UNI[si]) return UNI[si];
  const k = SKDEF[SKINS[si] && SKINS[si].id] || SKDEF.std, col = (v) => ({ value: new THREE.Color().setRGB(...(v || [1, 1, 1])) });
  return (UNI[si] = { uMode: { value: k.mode }, uGlow: { value: k.glow || 0 }, uA: col(k.a), uB: col(k.b), uC: col(k.c), uG: col(k.g || [0, 0, 0]), uS: { value: k.s || 30 }, uGS: { value: k.gs || 20 }, uGI: { value: k.gi || 0 }, uT: T, uPulse: PULSE });
}
const MATS = new Map(), BASE = new WeakMap(); // BASE: 스킨 재질 → 원래 재질 (복제한 모델도 원래 재질을 찾을 수 있게)
function skinMat(m, si) {
  if (!si || !SKINS[si] || !/_mat$/.test(m.name || '')) return m;
  const key = m.uuid + ':' + si; let cm = MATS.get(key); if (cm) return cm;
  const k = SKDEF[SKINS[si].id] || SKDEF.std, U = uniformsOf(si);
  cm = m.clone(); cm.metalness = k.metal ?? m.metalness; cm.roughness = k.rough ?? m.roughness;
  cm.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vSkinP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkinP = position;');
    sh.fragmentShader = GLSL + sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = skinCol(diffuseColor.rgb, vSkinP);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += skinGlow(vSkinP);');
  };
  cm.customProgramCacheKey = () => 'sc2skin';
  MATS.set(key, cm); BASE.set(cm, m); return cm;
}
// 모델(1인칭·3인칭)에 스킨 입히기. si = SKINS 번호 (0 = 기본)
export function applySkin(root, si) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    o.material = skinMat(BASE.get(o.material) || o.material, si);
  });
}
// 정조준 때 흐려지는 재질 (뒤 가늠자): 스킨 무늬는 그대로, 이 메시만 투명하게
const FADE = new WeakMap();
export function fadeMat(o, si) {
  const f = FADE.get(o); if (f && f.si === si) { o.material = f.m; return f.m; }
  const b = (f && f.b) || BASE.get(o.material) || o.material, c = b.clone(); c.name = b.name; c.transparent = true;
  const m = skinMat(c, si); m.transparent = true; o.material = m; FADE.set(o, { si, m, b }); BASE.set(m, b); return m;
}
// ── 구조 스킨: 총 모양 자체가 바뀌는 스킨 (assets/skins/<스킨>_<무기>.glb) ─────────────
// 모델 노드 extras: bone(붙일 뼈) · cat(파츠 역할: muz·barrel·irons·ironr·stock …) · node(움직이는 부품). 좌표는 무기 root 기준 (x 오른쪽 · y 총구 · z 위).
// 붙이면 원래 총 메시(root 아래)를 숨기고 역할 표시를 떼어 두고, 스킨 메시를 같은 이름의 뼈에 붙인다 → 손·장전 동작이 그대로 맞고 파츠도 스킨 부품을 숨기고 옮긴다.
export const SKIN_MODELS = { crimson: { titan: 'crimson_titan' } };
const SKM = {}, SKM_P = {};
export function skinModelId(si, vmId) { const t = SKIN_MODELS[SKINS[si] && SKINS[si].id]; return (t && t[vmId]) || null; }
export const skinModelReady = (key) => !!SKM[key];
export function loadSkinModel(key) {
  if (SKM[key]) return Promise.resolve(SKM[key]);
  if (SKM_P[key]) return SKM_P[key];
  SKM_P[key] = loader.loadAsync(`assets/skins/${key}.glb`).then((g) => {
    const nodes = [];
    g.scene.updateMatrixWorld(true);
    for (const o0 of [...g.scene.children]) {
      o0.traverse((m) => { if (m.isMesh) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; } });
      const u = o0.userData || {}; let o = o0;
      if (u.pivot) { // 움직이는 부품: 회전 중심에 빈 묶음을 두고 그 안에 (압축이 노드 위치를 옮겨도 중심 그대로)
        o = new THREE.Group(); o.position.fromArray(u.pivot); o.userData = { ...u }; o0.userData = {}; // 역할 표시는 묶음에만 (파츠가 옮길 때 두 번 옮기지 않게)
        o0.position.sub(o.position); o.add(o0);
      }
      o.updateMatrix();
      nodes.push({ obj: o, bone: u.bone || 'root', cat: u.cat || 'body', node: u.node || '' });
    }
    envOf(g.scene);
    return (SKM[key] = { key, nodes });
  }).catch((e) => { console.warn('스킨 모델을 못 불러옴', key, e); delete SKM_P[key]; throw e; });
  return SKM_P[key];
}
export function preloadSkinModels(pairs) { let p = Promise.resolve(); for (const [si, vm] of pairs) { const k = skinModelId(si, vm); if (k) p = p.then(() => loadSkinModel(k).catch(() => {})); } return p; }
const isFit = (o) => { for (let p = o; p; p = p.parent) if (/^(fit_|part_)/.test(p.name || '')) return true; return false; };
const WORN = new WeakMap(); // root → { hidden, added, nodes, gk } (userData 에는 열쇠 문자열만: 복제해도 안전)
export const skinNodesOf = (root) => (root && WORN.get(root)) || null;
// root = 무기 'root' 노드 (1인칭 VM 안 또는 3인칭 복제). key = null 이면 원래 총으로. 바뀌었으면 true (파츠는 다시 붙여야 함)
export function wearSkin(root, key) {
  if (!root) return false;
  const k = key && SKM[key] ? key : null;
  if ((root.userData.skinModel || null) === k) return false;
  const st = WORN.get(root);
  if (st) { for (const n of st.added) if (n.parent) n.parent.remove(n); for (const [n, vis, cat] of st.hidden) { n.visible = vis; if (cat !== undefined) n.userData.cat = cat; } }
  WORN.delete(root); root.userData.skinModel = null;
  if (!k) return true;
  const hidden = [], added = [], byNode = {};
  root.traverse((o) => { if (!o.isMesh || /^flash/i.test(o.name) || isFit(o)) return; hidden.push([o, o.visible, o.userData.cat]); o.visible = false; delete o.userData.cat; });
  for (const t of SKM[k].nodes) {
    const bone = t.bone === 'root' ? root : root.getObjectByName(t.bone) || root;
    const c = t.obj.clone(true), M = t.obj.matrix.clone();
    if (bone !== root) M.premultiply(restRel(root, bone).invert());
    M.decompose(c.position, c.quaternion, c.scale);
    c.userData = { cat: t.cat, node: t.node, skin: k }; c.name = 'skin_' + (t.node || t.cat);
    bone.add(c); added.push(c);
    if (t.node) (byNode[t.node] || (byNode[t.node] = [])).push(c);
  }
  WORN.set(root, { hidden, added, nodes: byNode, gk: null }); root.userData.skinModel = k;
  return true;
}
export function tickSkins(t) { T.value = t; PULSE.value *= 0.92; }
export function pulseSkin(k = 1) { PULSE.value = Math.max(PULSE.value, k); }
export function skinFire(k = 0.35) { PULSE.value = Math.min(1.2, PULSE.value + k * 0.3); }
export function setGunAds() {}
export function setGunQuality() {}
// 스킨의 궤적·총구 불꽃 색과 효과 종류 (전작과 같은 표)
const FX_FREE = { desert: { tracer: 0xffd08a, flash: 0xffb45a }, forest: { tracer: 0xbfff8a, flash: 0xd9ff9a }, urban: { tracer: 0xdfe8f2, flash: 0xfff0d0 } };
const FX = {
  carbon: { tracer: 0xff5a4a, flash: 0xff9a80, sfx: 'race', bundle: true }, tiger: { tracer: 0xffa02a, flash: 0xffb040, sfx: 'beast', bundle: true },
  sakura: { tracer: 0xff8fc0, flash: 0xffa6cf, sfx: 'petal', bundle: true }, ice: { tracer: 0x9fe6ff, flash: 0xbfeeff, sfx: 'frost', bundle: true },
  neon: { tracer: 0x19e3ff, flash: 0x7af4ff, sfx: 'cyber', bundle: true }, lava: { tracer: 0xff7a1a, flash: 0xff6a20, sfx: 'magma', bundle: true },
  gold: { tracer: 0xffd84a, flash: 0xffe27a, sfx: 'royal', bundle: true }, galaxy: { tracer: 0xc08cff, flash: 0xd0a0ff, sfx: 'cosmic', bundle: true },
  aurora: { tracer: 0xffffff, flash: 0xd8f4ff, rainbow: true, sfx: 'prism', bundle: true }, halloween: { tracer: 0xa64dff, flash: 0xff8a1a, sfx: 'spooky', bundle: true },
  platinum: { tracer: 0x7fdcff, flash: 0xbfeaff, sfx: 'prime', bundle: true }, damascus: { tracer: 0xffb04a, flash: 0xffd890, sfx: 'blade', bundle: true },
  obsidian: { tracer: 0xc89cff, flash: 0xe0c8ff, sfx: 'shard', bundle: true }, diamond: { tracer: 0xbff0ff, flash: 0xeaf8ff, sfx: 'crystal', bundle: true },
  atomic: { tracer: 0xff6a1a, flash: 0xffa040, sfx: 'reactor', bundle: true }, orion: { tracer: 0xffffff, flash: 0xe0e8ff, rainbow: true, sfx: 'star', bundle: true },
  darkmatter: { tracer: 0xb05cff, flash: 0xd08aff, sfx: 'void', bundle: true }, crimson: { tracer: 0xff6a1a, flash: 0xffa050, sfx: 'mecha', bundle: true },
  dragon: { tracer: 0xff2a1a, flash: 0xff6a40, sfx: 'dragon', bundle: true }, phoenix: { tracer: 0xffb040, flash: 0xffd080, sfx: 'phoenix', bundle: true },
  aqua: { tracer: 0x4ae8ff, flash: 0xa8f4ff, sfx: 'aqua', bundle: true },
};
export function skinFx(skin) { const id = SKINS[skin] && SKINS[skin].id; return FX[id] || FX_FREE[id] || null; }

// ── 3인칭·무기고용 총 ─────────────────────────────────────
// 바로 돌려주고, 모델이 아직 없으면 다 받는 대로 채운다. grip·fore·muzzle·sight 는 총 묶음 기준 [x, y, z] (총구 -Z)
export function makeGun(wi, skin = 0, parts = null, lv = 1) {
  const W = WEAPONS[wi] || WEAPONS[1], id = W.vm2, f = FIT[id] || FIT.hx9;
  const group = new THREE.Group(), inner = new THREE.Group(); group.add(inner);
  const conv = f.knife ? (v) => v : toG;
  if (!f.knife) inner.rotation.x = -Math.PI / 2;
  const mn = conv(f.min), mx = conv(f.max);
  const box = new THREE.Box3(new THREE.Vector3(Math.min(mn[0], mx[0]), Math.min(mn[1], mx[1]), Math.min(mn[2], mx[2])), new THREE.Vector3(Math.max(mn[0], mx[0]), Math.max(mn[1], mx[1]), Math.max(mn[2], mx[2])));
  const plan = planOf(id, wi, parts), fx = skinFx(skin), bundle = !!(fx && fx.bundle);
  if (plan.muzY != null) box.expandByPoint(new THREE.Vector3(0, 0, -plan.muzY)); // 소음기·장총열로 길어진 만큼
  group.userData.box = box;
  const muz = plan.muzY != null ? [0, plan.muzY, f.muzzle[2]] : f.muzzle;
  const info = { group, grip: conv(f.grip), fore: conv(f.fore), muzzle: conv(muz), sight: conv(f.sight) || [0, (box.max.y + conv(f.muzzle)[1]) * 0.5, 0], adsZ: 0, aura: null, wi, skin, emitter: null };
  let resolve; info.ready = new Promise((r) => (resolve = r));
  const fit = (cl) => { // 파츠 붙이고 스킨 (파츠 스킨 Lv.3 은 파츠 재질에도 무늬)
    const fi = fitParts(cl, id, wi, parts, { skin, lv, bundle, beam: true }); info.emitter = fi.emitter;
    applySkin(cl, skin);
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), rel = new THREE.Matrix4(), g = new THREE.Box3(), t = new THREE.Box3();
    const vis = (o) => { for (let p = o; p && p !== group; p = p.parent) if (!p.visible) return false; return true; };
    inner.traverse((o) => { if (!o.isMesh || o.name === 'laser_beam' || !vis(o)) return; o.geometry.boundingBox || o.geometry.computeBoundingBox(); g.union(t.copy(o.geometry.boundingBox).applyMatrix4(rel.multiplyMatrices(inv, o.matrixWorld))); });
    if (!g.isEmpty()) group.userData.box = g; // 실제 크기 (파츠 포함, 레이저 빛줄기는 뺌)
  };
  const key = skinModelId(skin, id);
  const fill = (m) => {
    const cl = m.pristine.clone(true); cl.position.set(0, 0, 0); cl.quaternion.identity(); cl.scale.set(1, 1, 1); cl.traverse((o) => { if (/^flash/i.test(o.name)) o.visible = false; });
    inner.add(cl);
    const go = () => {
      if (key && wearSkin(cl, key)) unfit(cl); // 구조 스킨: 모양이 바뀐 부품에 파츠를 다시 맞춤
      if (partsReady() || !(parts && parts.length)) { fit(cl); resolve(info); }
      else { applySkin(cl, skin); loadParts().then(() => { fit(cl); resolve(info); }, () => resolve(info)); }
    };
    if (key && !skinModelReady(key)) { applySkin(cl, skin); loadSkinModel(key).then(go, go); } else go();
  }; // 총구 불꽃 모델은 숨김 (3인칭 불꽃은 avatar.js 의 그림)
  if (cache[id]) fill(cache[id]); else if (id) loadModel(id).then(fill, () => resolve(info));
  return info;
}
// 모델 크기 (모델을 아직 못 받았어도 잰 값으로)
export function gunBox(group) {
  const b = group.userData && group.userData.box;
  if (b) return b.clone().applyMatrix4(new THREE.Matrix4().makeScale(group.scale.x, group.scale.y, group.scale.z));
  return new THREE.Box3().setFromObject(group);
}
