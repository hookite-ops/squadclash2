// SQUAD CLASH 2 — 파츠(부착물): assets/parts.glb 의 부품을 무기 모델(1인칭·3인칭·무기고)의 제자리에 붙인다.
// 무기 모델(VM GLB)의 내장 부품은 노드 extras.cat 으로 역할이 적혀 있다 (muz 총구 장치 · sup 내장 소음기 · barrel 총열 · irons 가늠자 · optic 조준경 · stock 개머리판 · fgrip 손잡이 · handle).
// 파츠를 달면 같은 역할의 내장 부품을 숨기거나 옮기고(장총열이면 총구 장치를 앞으로), 파츠 모델을 장착점에 붙인다.
// 좌표: root 기준 (x 오른쪽 · y 총구 쪽 · z 위, m). 파츠 모델은 앞이 -Z, 위가 +Y 라서 x 축으로 90° 돌려 붙인다.
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/addons/libs/meshopt_decoder.module.js';
import { WEAPONS, PARTS, cleanParts } from './shared.js';

// 무기(vm2)마다 장착점: muz 총구(y0 총구 장치가 붙는 총열 끝 · end 원래 총구 끝 · r 총열 반지름) · bar 총열 구간 · opt 조준경(레일 윗면) · grp 손잡이(레일 아랫면) · las 레이저 · stk 원래 개머리판 상자 · sight 가늠자 선(r 뒤 → f 앞, e 눈 거리) · acc 빛 색
export const MOUNT = {"swarm":{"muz":{"y0":0.196,"z":0.063,"r":0.0065,"end":0.235,"bone":"slide","cover":0.236},"opt":{"y":0.003,"z":0.078,"y0":-0.036,"y1":0.196,"bone":"slide"},"las":{"y":0.152,"x":0,"z":0.03,"side":"b","bone":"root"},"acc":"#a78bfa"},"whisper":{"muz":{"y0":0.156,"z":0.062,"r":0.006,"end":0.3181,"bone":"root"},"opt":{"y":0.003,"z":0.076,"y0":-0.036,"y1":0.162,"bone":"slide"},"las":{"y":0.13,"x":0,"z":0.03,"side":"b","bone":"root"},"acc":"#38bdf8"},"punk":{"muz":{"y0":0.25,"z":0.0591,"r":0.0076,"end":0.25,"bone":"barrels","multi":[-0.0082,0.0082]},"opt":{"y":0.0125,"z":0.0597,"y0":-0.0335,"y1":0.076,"bone":"root"},"las":{"y":0.154,"x":0,"z":0.029,"side":"b","bone":"barrels"},"acc":"#fb923c"},"highnoon":{"muz":{"y0":0.236,"z":0.0601,"r":0.0085,"end":0.236,"bone":"root","sleeve":0.0108},"bar":{"y0":0.076,"y1":0.234,"r":0.0085},"opt":{"y":0.032,"z":0.082,"y0":-0.0296,"y1":0.092,"bone":"root"},"las":{"y":0.136,"x":0,"z":0.032,"side":"b","bone":"root"},"acc":"#38bdf8"},"wasp":{"muz":{"y0":0.256,"z":0.0581,"r":0.007,"end":0.28,"bone":"root"},"bar":{"y0":0.192,"y1":0.26,"r":0.007},"opt":{"y":0.0461,"z":0.092,"y0":-0.048,"y1":0.176,"bone":"root"},"grp":{"y":0.136,"z":0.03,"builtin":true},"las":{"y":0.221,"x":0.013,"z":0.0581,"side":"r","bone":"root","on":"shroud"},"stk":{"y0":-0.198,"y1":-0.066,"z0":0.0065,"z1":0.082,"w":0.036},"sight":{"r":[-0.036,0.1065],"f":[0.1647,0.1065],"e":0.075},"acc":"#a78bfa"},"mist":{"muz":{"y0":0.128,"z":0.0601,"r":0.009,"end":0.3359,"bone":"root"},"opt":{"y":0.025,"z":0.094,"y0":-0.052,"y1":0.124,"bone":"root"},"las":{"y":0.093,"x":0.0166,"z":0.084,"side":"r","bone":"root","on":"upper_shell"},"stk":{"y0":-0.245,"y1":-0.076,"z0":-0.0034,"z1":0.092,"w":0.038},"acc":"#a78bfa","grp":{"y":0.215,"z":0.0385,"builtin":false}},"hammer":{"muz":{"y0":0.5742,"z":0.0698,"r":0.011,"end":0.5742,"bone":"root"},"bar":{"y0":0.142,"y1":0.572,"r":0.011},"opt":{"y":0.0434,"z":0.086,"y0":-0.028,"y1":0.142,"bone":"root"},"las":{"y":0.513,"x":0.013,"z":0.056,"side":"r","bone":"root"},"stk":{"y0":-0.251,"y1":-0.028,"z0":-0.0451,"z1":0.0782,"w":0.038},"sight":{"r":[0.001,0.0985],"f":[0.558,0.0929],"e":0.08},"acc":"#fb923c"},"tempest":{"muz":{"y0":0.386,"z":0.062,"r":0.009,"end":0.4199,"bone":"root"},"opt":{"y":0.005,"z":0.098,"y0":-0.05,"y1":0.1761,"bone":"root"},"grp":{"y":0.285,"z":0.042,"builtin":true},"las":{"y":0.351,"x":0.02,"z":0.062,"side":"r","bone":"root","on":"shroud"},"stk":{"y0":-0.237,"y1":-0.076,"z0":-0.0331,"z1":0.0862,"w":0.04},"acc":"#fb923c"},"hail":{"muz":{"y0":0.557,"z":0.0742,"r":0.0075,"end":0.6069,"bone":"root"},"bar":{"y0":0.234,"y1":0.557,"r":0.0075},"opt":{"y":0.0812,"z":0.104,"y0":-0.028,"y1":0.232,"bone":"root"},"grp":{"y":0.4125,"z":0.05,"builtin":false},"las":{"y":0.3425,"x":0.022,"z":0.086,"side":"r","bone":"root","on":"hg_top"},"stk":{"y0":-0.328,"y1":-0.024,"z0":-0.03,"z1":0.117,"w":0.04},"sight":{"r":[0.01,0.142],"f":[0.4789,0.114],"e":0.055},"acc":"#ffb347"},"sentinel":{"muz":{"y0":0.602,"z":0.062,"r":0.008,"end":0.6499,"bone":"root"},"bar":{"y0":0.442,"y1":0.604,"r":0.008},"opt":{"y":0.05,"z":0.096,"y0":-0.058,"y1":0.164,"bone":"root"},"grp":{"y":0.3325,"z":0.042,"builtin":false},"las":{"y":0.3825,"x":0.02,"z":0.062,"side":"r","bone":"root","on":"handguard"},"stk":{"y0":-0.277,"y1":-0.076,"z0":-0.0293,"z1":0.098,"w":0.04},"acc":"#34d399"},"nightfall":{"muz":{"y0":0.44,"z":0.062,"r":0.007,"end":0.606,"bone":"root"},"bar":{"y0":0.402,"y1":0.448,"r":0.007},"opt":{"y":-0.005,"z":0.096,"y0":-0.058,"y1":0.164,"bone":"root"},"grp":{"y":0.3225,"z":0.0439,"builtin":false},"las":{"y":0.3725,"x":0.019,"z":0.062,"side":"r","bone":"root","on":"handguard"},"stk":{"y0":-0.245,"y1":-0.076,"z0":-0.0034,"z1":0.092,"w":0.038},"acc":"#34d399"},"titan":{"muz":{"y0":0.532,"z":0.062,"r":0.0085,"end":0.5942,"bone":"root"},"bar":{"y0":0.442,"y1":0.534,"r":0.0085},"opt":{"y":0.0352,"z":0.096,"y0":-0.058,"y1":0.164,"bone":"root"},"grp":{"y":0.3525,"z":0.032,"builtin":false},"las":{"y":0.4025,"x":0.0205,"z":0.078,"side":"r","bone":"root","on":"hg_shell"},"stk":{"y0":-0.255,"y1":-0.076,"z0":-0.0311,"z1":0.0902,"w":0.036},"sight":{"r":[-0.038,0.1145],"f":[0.4242,0.1145],"e":0.075},"acc":"#34d399"},"falcon":{"muz":{"y0":0.668,"z":0.062,"r":0.008,"end":0.7002,"bone":"root"},"bar":{"y0":0.472,"y1":0.672,"r":0.008},"opt":{"y":0.051,"z":0.096,"y0":-0.052,"y1":0.164,"bone":"root"},"grp":{"y":0.3525,"z":0.044,"builtin":false},"las":{"y":0.4025,"x":0.0185,"z":0.062,"side":"r","bone":"root","on":"handguard"},"stk":{"y0":-0.277,"y1":-0.076,"z0":-0.0333,"z1":0.098,"w":0.04},"acc":"#f472b6"},"rail":{"muz":{"y0":0.79,"z":0.064,"r":0.0105,"end":0.8682,"bone":"root"},"bar":{"y0":0.5,"y1":0.794,"r":0.0105},"opt":{"y":0.058,"z":0.096,"y0":-0.058,"y1":0.492,"bone":"root"},"grp":{"y":0.3725,"z":0.038,"builtin":false},"las":{"y":0.4225,"x":0.021,"z":0.064,"side":"r","bone":"root","on":"handguard"},"stk":{"y0":-0.281,"y1":-0.076,"z0":-0.0333,"z1":0.098,"w":0.04},"acc":"#f472b6"},"storm":{"muz":{"y0":0.59,"z":0.064,"r":0.009,"end":0.6362,"bone":"root"},"bar":{"y0":0.492,"y1":0.594,"r":0.009},"opt":{"y":0.067,"z":0.112,"y0":-0.012,"y1":0.176,"bone":"cover"},"grp":{"y":0.365,"z":0.052,"builtin":true},"las":{"y":0.4791,"x":0.024,"z":0.064,"side":"r","bone":"root","on":"shroud"},"stk":{"y0":-0.267,"y1":-0.086,"z0":-0.0251,"z1":0.0942,"w":0.042},"sight":{"r":[0.002,0.1225],"f":[0.4837,0.1052],"e":0.065},"acc":"#facc15"},"blitz":{"muz":{"y0":0.622,"z":0.0659,"r":0.01,"end":0.6641,"bone":"root"},"bar":{"y0":0.502,"y1":0.624,"r":0.01},"opt":{"y":-0.015,"z":0.11,"y0":-0.066,"y1":0.234,"bone":"root"},"grp":{"y":0.386,"z":0.048,"builtin":true},"las":{"y":0.4991,"x":0.03,"z":0.0659,"side":"r","bone":"root","on":"cooler"},"stk":{"y0":-0.277,"y1":-0.096,"z0":-0.0211,"z1":0.0982,"w":0.048},"acc":"#facc15"},"hx9":{"muz":{"y0":0.177,"z":0.063,"r":0.0065,"end":0.178,"bone":"slide"},"opt":{"y":0.003,"z":0.078,"y0":-0.036,"y1":0.177,"bone":"slide"},"las":{"y":0.13,"x":0,"z":0.032,"side":"b","bone":"root"},"acc":"#38bdf8"}};
// 파츠 안의 표식 (파츠 좌표 m: x 오른쪽, u 앞, v 위)
const MARK = { sup: { tip: [0, 0.152, 0] }, sup_p: { tip: [0, 0.112, 0] }, comp: { tip: [0, 0.058, 0] }, brake: { tip: [0, 0.064, 0] }, comp_p: { tip: [0, 0.030, 0] }, brake_p: { tip: [0, 0.032, 0] },
  dot: { ret: [0, 0.0084, 0.022], half: [0.021, 0.021] }, dot_p: { ret: [0, 0.0064, 0.0115], half: [0.012, 0.012] }, holo: { ret: [0, 0.0185, 0.023], half: [0.027, 0.024] }, x3: { ret: [0, -0.0616, 0.031], half: [0.038, 0.034] },
  las: { em: [0.015, 0.0246, 0.003] }, las_p: { em: [0, 0.0195, -0.012] } };
const V = (x, y, z) => new THREE.Vector3(x, y, z), ONE = new THREE.Vector3(1, 1, 1);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const QP = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2); // 파츠 좌표 → root 좌표
const pt = (a) => V(a[0], a[2], -a[1]); // 파츠 표식 [x,u,v] → 파츠 모델 좌표

// ── 불러오기 ─────────────────────────────────────────────
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
let LIB = null, LIBP = null, ENVF = () => null, MAT_MAIN = null, MAT_SKIN = null, MAT_LENS = null, GLOW_SRC = null;
const GLOWS = new Map(), BOX = {};
export function loadParts(envFn) {
  if (envFn) ENVF = envFn;
  if (LIBP) return LIBP;
  LIBP = loader.loadAsync('assets/parts.glb').then((g) => {
    const lib = {};
    for (const o of g.scene.children) if (o.name.startsWith('p_')) {
      lib[o.name.slice(2)] = o;
      o.traverse((m) => { if (!m.isMesh) return; m.frustumCulled = false; const n = m.material && m.material.name; if (n === 'parts_plain') MAT_MAIN = m.material; else if (n === 'pt_glow') GLOW_SRC = m.material; });
    }
    MAT_LENS = new THREE.MeshStandardMaterial({ name: 'pt_glass', color: 0xa8d8ff, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.1, depthWrite: false, emissive: 0x1d4f6a, emissiveIntensity: 0.12, envMapIntensity: 0.35 });
    MAT_SKIN = MAT_MAIN.clone(); MAT_SKIN.name = 'parts_mat'; // 파츠 스킨(Lv.3): 총 스킨 무늬가 입혀지는 재질
    for (const k in lib) { const b = new THREE.Box3().setFromObject(lib[k]); BOX[k] = b; }
    LIB = lib; return lib;
  }).catch((e) => { console.warn('파츠 모델을 못 불러옴', e); LIBP = null; throw e; });
  return LIBP;
}
export const partsReady = () => !!LIB;
function env() { const e = ENVF(); if (e && MAT_MAIN && MAT_MAIN.envMap !== e) for (const m of [MAT_MAIN, MAT_SKIN]) { m.envMap = e; m.envMapIntensity = 0.85; m.needsUpdate = true; } }
function glowMat(hex) { let m = GLOWS.get(hex); if (!m) { m = GLOW_SRC.clone(); m.color.set(hex); m.emissive.set(hex); m.emissiveIntensity = 2.4; GLOWS.set(hex, m); } return m; }
function clone(pid, acc, skinned) {
  const c = new THREE.Group(); c.add(LIB[pid].clone(true)); // 감싸서 늘이고 줄임 (안쪽 노드의 양자화 크기는 그대로)
  c.traverse((m) => { if (!m.isMesh) return; const n = m.material.name; m.material = n === 'pt_glow' ? glowMat(acc) : n === 'pt_lens' ? MAT_LENS : skinned ? MAT_SKIN : MAT_MAIN; if (n === 'pt_lens') m.renderOrder = 5; m.castShadow = false; m.receiveShadow = false; });
  c.name = 'part_' + pid; return c;
}
function mark(c, a) { const o = new THREE.Object3D(); o.position.copy(pt(a)); o.name = 'mark'; c.add(o); return o; }

// 쉬는 자세(동작이 묻기 전) 기준 root → 뼈 행렬. guns.js 가 불러올 때 userData.rest 에 적어 둠
const _m = new THREE.Matrix4();
function restRel(root, node) {
  const m = new THREE.Matrix4();
  for (let p = node; p && p !== root; p = p.parent) m.premultiply(p.userData.rest ? _m.fromArray(p.userData.rest) : (p.updateMatrix(), p.matrix));
  return m;
}
export function noteRest(root) { root.traverse((o) => { o.updateMatrix(); o.userData.rest = o.matrix.toArray(); }); }

// ── 파츠 계획 (모델 없이도 계산: 새 총구 자리 등) ─────────────────
const BAR_L = { smg: 0.032, sr: 0.06, side: 0.026 };
export function planOf(id, wi, parts) {
  const M = MOUNT[id], W = WEAPONS[wi];
  const at = {}; for (const pi of cleanParts(wi, parts)) at[PARTS[pi].slot] = PARTS[pi].id;
  if (!M) return { at, muzY: null };
  const mz = M.muz, pistol = W.cat === 'side', B = M.bar;
  let dL = 0, light = 0;
  if (at.bar === 'long') dL = pistol ? BAR_L.side : BAR_L[W.cat] || 0.046;
  else if (at.bar === 'light' && B && !pistol) { const ex = B.y1 - B.y0; light = Math.min(0.022, Math.max(0, ex - 0.03) * 0.5); if (light > 0.004) dL = -light; else light = 0; }
  let muzY = mz.end + (pistol ? 0 : dL), baseY = mz.y0 + dL, mpid = null, ms = 1, mu = 1, my = baseY;
  if (pistol && at.bar === 'long') { muzY = mz.end + dL; baseY = muzY; my = baseY; }
  if (at.muz) {
    mpid = pistol ? { sup: 'sup_p', comp: 'comp_p', brake: 'brake_p' }[at.muz] : at.muz;
    ms = pistol ? clamp(mz.r / 0.0065, 0.9, 1.2) : clamp(mz.r / 0.0085, 0.85, 1.3);
    if (mz.cover && at.muz !== 'sup') { my = mz.y0; mu = (mz.cover - mz.y0) / (MARK[mpid].tip[1] * ms); } // 슬라이드 앞부터 총열 끝까지 덮음
    else if (mz.cover) my = mz.cover - 0.001;
    muzY = my + MARK[mpid].tip[1] * ms * mu;
  }
  return { at, M, dL, light, baseY, muzY, mpid, ms, mu, my, pistol };
}

// ── 붙이기 ───────────────────────────────────────────────
const FITS = new WeakMap();
// root = 무기 모델의 'root' 노드(1인칭 VM 장면 안 또는 3인칭 복제). o = { skin, lv, bundle, beam(3인칭 레이저 빛줄기) }
// 돌려줌: { muzzle [x,y,z] · ret 조준점 종류(dot·dot_p·holo·x3) · retObj 조준점 표식 · sight 조준점(root) · emitter 레이저 표식 · decos 도는 장식 }
export function fitParts(root, id, wi, parts, o = {}) {
  const pl = cleanParts(wi, parts), bundle = !!o.bundle, lv = o.lv || 1, key = pl.join('.') + ':' + (bundle && lv >= 3 ? (lv >= 5 ? 2 : 1) : 0) + ':' + (o.beam ? 1 : 0) + ':' + (LIB ? 1 : 0);
  const old = FITS.get(root);
  if (old && old.key === key) return old.info;
  unfit(root);
  const P = planOf(id, wi, pl), M = P.M, W = WEAPONS[wi];
  const info = { muzzle: M ? [0, P.muzY, M.muz.z] : null, ret: null, retObj: null, sight: null, emitter: null, decos: [] };
  const fit = { key, info, added: [], hidden: [], moved: [], wraps: [], mag: null, flash: null };
  FITS.set(root, fit);
  if (!M || !LIB) return info;
  env();
  const at = P.at, acc = M.acc, skinned = bundle && lv >= 3, deco = bundle && lv >= 5, pistol = P.pistol, mz = M.muz;
  const cats = (c) => { const out = []; root.traverse((n) => { if (n.userData && n.userData.cat === c) out.push(n); }); return out; };
  const hide = (c) => { for (const n of cats(c)) if (n.visible) { n.visible = false; fit.hidden.push(n); } };
  const move = (c, dy) => { for (const n of cats(c)) { n.position.y += dy; fit.moved.push([n, dy]); } };
  const place = (bone, pos) => {
    const b = bone && bone !== 'root' ? root.getObjectByName(bone) || root : root;
    const m = new THREE.Matrix4().compose(pos, QP, ONE);
    if (b !== root) m.premultiply(restRel(root, b).invert());
    const h = new THREE.Group(); h.name = 'fit_part'; m.decompose(h.position, h.quaternion, h.scale); b.add(h); fit.added.push(h); return h;
  };
  const add = (pid, bone, pos, sc) => { const h = place(bone, pos), c = clone(pid, acc, skinned); if (sc) c.scale.copy(sc); h.add(c); return c; };
  const wrapY = (nodes, y0, k) => { for (const n of nodes) { const par = n.parent, g = new THREE.Group(); g.name = 'fit_wrap'; g.position.set(0, y0, 0); g.scale.set(1, k, 1); par.add(g); n.position.y -= y0; g.add(n); fit.wraps.push([n, g, par, y0]); } };
  // 총열
  if (at.bar) {
    const xs = mz.multi || [0];
    if (pistol) { // 리볼버·겹총열: 총구에 덧대는 연장관 / 가벼운 고리
      for (const x of xs) {
        const r = mz.sleeve || mz.r;
        if (at.bar === 'long') add('bar_ext', mz.bone, V(x, mz.end - 0.003, mz.z), V(r / 0.01, r / 0.01, (P.dL + 0.003) / 0.1));
        else add('bar_ring', mz.bone, V(x, mz.end - 0.01, mz.z), V(r * 1.04 / 0.0125, r * 1.04 / 0.0125, 0.8));
      }
    } else {
      const B = M.bar;
      if (at.bar === 'long') {
        if (B) wrapY(cats('barrel'), B.y0, (B.y1 - B.y0 + P.dL) / (B.y1 - B.y0));
        else add('bar_ext', 'root', V(0, mz.y0 - 0.002, mz.z), V(mz.r / 0.01, mz.r / 0.01, (P.dL + 0.004) / 0.1));
        move('muz', P.dL); move('sup', P.dL);
      } else {
        if (P.light) { wrapY(cats('barrel'), B.y0, (B.y1 - B.y0 - P.light) / (B.y1 - B.y0)); move('muz', -P.light); move('sup', -P.light); }
        const y = B ? B.y0 + 0.002 : mz.y0 - 0.008, r = mz.r * 1.02 / 0.0125 * 1.25;
        add('bar_ring', 'root', V(0, y, mz.z), V(r, r, 1));
      }
    }
  }
  // 총구 장치
  if (at.muz && P.mpid) {
    hide('muz');
    const c = add(P.mpid, mz.bone, V(0, P.my, mz.z), V(P.ms, P.ms, P.ms * P.mu));
    if (deco) info.decos.push(spinDeco(c, P.mpid, acc));
  }
  const fl = root.getObjectByName('flash');
  if (fl && Math.abs(P.muzY - mz.end) > 1e-4) { fit.flash = [fl, fl.position.y]; fl.position.y += P.muzY - mz.end; }
  // 조준경
  if (at.opt && M.opt) {
    const op = M.opt, pid = pistol ? 'dot_p' : at.opt, h = MARK[pid].half;
    if (!pistol) { hide('optic'); hide('irons'); hide('ironr'); }
    let y = op.y + (pid === 'x3' ? 0.018 : 0);
    if (op.y1 - op.y0 > h[0] + h[1] + 0.004) y = clamp(y, op.y0 + h[0] + 0.002, op.y1 - h[1] - 0.002);
    const c = add(pid, op.bone, V(0, y, op.z));
    const r = MARK[pid].ret; info.retObj = mark(c, r); info.ret = pid; info.sight = [0, y + r[1], op.z + r[2]];
    if (deco && !at.muz) info.decos.push(spinDeco(c, pid, acc));
  }
  // 개머리판: 원래 개머리판 상자에 맞춰 늘이고 줄임
  if (at.stk && M.stk) {
    hide('stock');
    const S = M.stk, b = BOX[at.stk], uMin = -b.max.z, uMax = -b.min.z, vMin = b.min.y, vMax = b.max.y;
    const su = (S.y1 - S.y0 + 0.004) / (uMax - uMin), sv = (S.z1 - S.z0) / (vMax - vMin), sx = clamp(S.w / 0.034, 0.9, 1.25);
    const c = add(at.stk, 'root', V(0, S.y1 + 0.002 - uMax * su, S.z0 - vMin * sv), V(sx, sv, su));
    if (deco && !at.muz && !at.opt) info.decos.push(spinDeco(c, at.stk, acc));
  }
  // 손잡이
  if (at.grp && M.grp) { if (M.grp.builtin) hide('fgrip'); add(at.grp, 'root', V(0, M.grp.y, M.grp.z)); }
  // 탄창: 대용량은 원래 탄창을 탄창 축으로 늘이고, 빠른 탄창은 바닥에 당김 고리. 탄창 뼈는 root 와 축이 달라서 (기울어진 권총 탄창 등) 뼈 기준으로 계산
  const magB = at.mag && root.getObjectByName('mag');
  if (magB) {
    const R = restRel(root, magB), kids = magB.children.filter((k) => k.isMesh), box = new THREE.Box3(), tb = new THREE.Box3();
    for (const k of kids) { if (!k.geometry.boundingBox) k.geometry.computeBoundingBox(); k.updateMatrix(); box.union(tb.copy(k.geometry.boundingBox).applyMatrix4(k.matrix)); }
    if (!box.isEmpty()) {
      const e = R.elements, colZ = [e[2], e[6], e[10]]; let a = 0; for (let i = 1; i < 3; i++) if (Math.abs(colZ[i]) > Math.abs(colZ[a])) a = i; // 위아래에 가장 가까운 뼈 축
      const up = colZ[a] > 0, ctr = box.getCenter(V(0, 0, 0)), top = ctr.clone(), bot = ctr.clone(), ax = ['x', 'y', 'z'][a];
      top[ax] = up ? box.max[ax] : box.min[ax]; bot[ax] = up ? box.min[ax] : box.max[ax];
      if (at.mag === 'ext') {
        const drum = !!(W.model[1] && (W.model[1].auto || W.model[1].hmg)), k = pistol ? 1.24 : W.model[1] && W.model[1].lmg ? 1.22 : 1.32, g = new THREE.Group(); g.name = 'fit_mag';
        g.position.copy(top); if (drum) g.scale.setScalar(1.14); else g.scale[ax] = k;
        magB.add(g); for (const kd of kids) { kd.position.sub(top); g.add(kd); } fit.mag = { g, kids, off: top.clone() };
      } else {
        const h = new THREE.Group(); h.name = 'fit_part'; h.position.copy(bot); h.quaternion.setFromRotationMatrix(R).invert().multiply(QP); magB.add(h); fit.added.push(h);
        const sz = box.getSize(V(0, 0, 0)), across = a === 1 ? sz.z : sz.y; // 탄창 앞뒤 길이 (축이 아닌 쪽)
        const c = clone('fast', acc, skinned); c.scale.set(clamp(sz.x / 0.026, 0.7, 1.6), 1, clamp(across / 0.04, 0.6, 1.8)); h.add(c);
      }
    }
  }
  // 레이저
  if (at.las && M.las) {
    const L = M.las, pid = L.side === 'b' ? 'las_p' : 'las';
    const c = add(pid, L.bone, V(L.x || 0, L.y, L.z));
    info.emitter = mark(c, MARK[pid].em);
    if (o.beam) info.emitter.add(beamMesh());
  }
  return info;
}
export function unfit(root) {
  const f = FITS.get(root); if (!f) return;
  for (const h of f.added) if (h.parent) h.parent.remove(h);
  for (const n of f.hidden) n.visible = true;
  for (const [n, dy] of f.moved) n.position.y -= dy;
  for (let i = f.wraps.length - 1; i >= 0; i--) { const [n, g, par, y0] = f.wraps[i]; par.add(n); n.position.y += y0; par.remove(g); }
  if (f.mag) { const { g, kids, off } = f.mag, par = g.parent; for (const k of kids) { k.position.add(off); par.add(k); } par.remove(g); }
  if (f.flash) f.flash[0].position.y = f.flash[1];
  FITS.delete(root);
}

// 3인칭 레이저 빛줄기: 십자로 겹친 얇은 판 두 장, 멀어질수록 흐려짐 (앞 = -Z)
let BEAM_G = null, BEAM_M = null;
function beamMesh() {
  if (!BEAM_G) {
    const L = 6, w = 0.0016, pos = [], col = [], idx = [];
    for (let k = 0; k < 2; k++) { const b = pos.length / 3; for (const [s, z, a] of [[-1, 0, 1], [1, 0, 1], [1, -L, 0], [-1, -L, 0]]) { pos.push(k ? 0 : s * w, k ? s * w : 0, z); col.push(a, a * 0.06, a * 0.04); } idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    BEAM_G = new THREE.BufferGeometry(); BEAM_G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); BEAM_G.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); BEAM_G.setIndex(idx);
    BEAM_M = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  }
  const m = new THREE.Mesh(BEAM_G, BEAM_M); m.frustumCulled = false; m.renderOrder = 6; m.name = 'laser_beam'; return m;
}
// 파츠 각성(Lv.5): 파츠 둘레를 도는 빛 고리와 보석 세 개
const SPIN_T = { value: 0 };
export function tickParts(t) { SPIN_T.value = t; }
function spinDeco(c, pid, acc) {
  const b = BOX[pid], ctr = b.getCenter(V(0, 0, 0)), sz = b.getSize(V(0, 0, 0));
  const R = Math.max(sz.x, sz.y) * 0.62 + 0.004, g = new THREE.Group(); g.name = 'deco'; g.position.copy(ctr);
  const gm = glowMat(acc), gem = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(acc), emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.15 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, Math.max(0.0008, R * 0.05), 8, 36), gm); g.add(ring);
  for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3, s = new THREE.Mesh(new THREE.OctahedronGeometry(R * 0.16), gem); s.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); g.add(s); }
  ring.onBeforeRender = () => { g.rotation.z = SPIN_T.value * 1.6; };
  c.add(g); return g;
}
