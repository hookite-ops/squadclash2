// 격납고 7번: 렌더러·조명·후처리 + 경기장(바닥·벽·엄폐물·출입구) + 충돌 상자
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { G, ARENA } from './state.js';

let composer = null, bloom = null, sun = null, Q = null;
// 화질 단계: 해상도 배율 · 번짐(블룸) · 계단 현상 줄이기(MSAA) · 그림자
const QL = {
  low: { pr: () => Math.min(devicePixelRatio, 1) * 0.8, post: false, msaa: 0, shadow: false },
  mid: { pr: () => Math.min(devicePixelRatio, G.touch ? 1.6 : 1.25), post: true, msaa: 0, shadow: false },
  high: { pr: () => Math.min(devicePixelRatio, 2), post: true, msaa: 4, shadow: true },
};
export function initRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: !G.touch, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  r.setSize(innerWidth, innerHeight, false);
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace;
  r.autoClear = false;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  G.renderer = r;
  const s = new THREE.Scene(); G.scene = s;
  s.background = new THREE.Color(0x0b121a); s.fog = new THREE.FogExp2(0x0d1620, 0.022);
  const cam = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 200); cam.rotation.order = 'YXZ'; G.camera = cam;
  const pm = new THREE.PMREMGenerator(r); const env = pm.fromScene(new RoomEnvironment(), 0.04).texture; G.env = env;
  s.environment = env; s.environmentIntensity = 0.35;
  s.add(new THREE.HemisphereLight(0x9fc4e8, 0x1a1410, 0.9));
  sun = new THREE.DirectionalLight(0xfff1dc, 1.6); sun.position.set(14, 30, 8); s.add(sun);
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.035;
  const sc = sun.shadow.camera; sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 80; sc.updateProjectionMatrix();
  const rim = new THREE.DirectionalLight(0x5aa8ff, 0.5); rim.position.set(-20, 12, -16); s.add(rim);
}
function buildComposer(msaa) {
  if (composer) { composer.dispose(); bloom?.dispose(); }
  const r = G.renderer, pr = r.getPixelRatio();
  const rt = new THREE.WebGLRenderTarget(Math.max(1, innerWidth * pr), Math.max(1, innerHeight * pr), { type: THREE.HalfFloatType, samples: msaa });
  composer = new EffectComposer(r, rt);
  composer.addPass(new RenderPass(G.scene, G.camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.7, 0.45, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}
export function setQuality(name) {
  if (Q === name || !QL[name]) return;
  const prev = Q && QL[Q], q = QL[name]; Q = name;
  const r = G.renderer; r.setPixelRatio(q.pr());
  if (!composer || prev.msaa !== q.msaa) buildComposer(q.msaa);
  if (!prev || prev.shadow !== q.shadow) {
    r.shadowMap.enabled = q.shadow; sun.castShadow = q.shadow;
    G.scene.traverse((o) => { const m = o.material; if (m) for (const x of Array.isArray(m) ? m : [m]) x.needsUpdate = true; });
  }
  resize();
}
export const quality = () => Q;
export function resize() {
  const r = G.renderer; r.setSize(innerWidth, innerHeight, false);
  G.camera.aspect = innerWidth / innerHeight; G.camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(r.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
}
export function renderWorld() { G.renderer.clear(); if (!QL[Q]?.post) G.renderer.render(G.scene, G.camera); else composer.render(); }

// ── 절차 텍스처 ─────────────────────────────────────────
function canvasTex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep);
  t.anisotropy = 4; return t;
}
function noise(g, w, h, a, n = 3000) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } }
const TEX = {};
function makeTextures() {
  TEX.floor = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#2a3036'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.08, 9000);
    g.strokeStyle = '#1a1f24'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
    g.strokeStyle = '#3b444c'; g.lineWidth = 2; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#e8a23a33'; g.fillRect(0, h / 2 - 3, w, 6);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#11151a'; g.beginPath(); g.arc(20 + (i % 2) * (w - 40), 20 + (i >> 1) * (h - 40), 5, 0, 7); g.fill(); }
  }, [ARENA.half / 2, ARENA.half / 2]);
  TEX.wall = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#39414a'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.07, 6000);
    for (let y = 0; y < h; y += 128) { g.fillStyle = '#272d33'; g.fillRect(0, y, w, 6); g.fillStyle = '#4a545e'; g.fillRect(0, y + 6, w, 2); }
    for (let x = 0; x < w; x += 256) { g.fillStyle = '#272d33'; g.fillRect(x, 0, 5, h); }
    g.fillStyle = '#20262c'; for (let i = 0; i < 24; i++) g.fillRect(30 + (i % 6) * 80, 40 + ((i / 6) | 0) * 128, 26, 4);
  });
  TEX.crate = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4b5a3a'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.1, 2500);
    g.strokeStyle = '#2e3824'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
    g.strokeStyle = '#68784f'; g.lineWidth = 3; g.strokeRect(16, 16, w - 32, h - 32);
    g.lineWidth = 10; g.strokeStyle = '#3a4630'; g.beginPath(); g.moveTo(16, 16); g.lineTo(w - 16, h - 16); g.stroke();
    g.fillStyle = '#e9e4d0aa'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('A19', w / 2, h / 2 + 50);
  });
  TEX.crate2 = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7a5226'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.1, 2500);
    g.strokeStyle = '#4a3218'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
    for (let x = 30; x < w; x += 50) { g.fillStyle = '#5f3f1c'; g.fillRect(x, 12, 8, h - 24); }
    g.fillStyle = '#111a'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center'; g.fillText('⚠ 탄약', w / 2, h / 2 + 10);
  });
  TEX.pillar = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#5a6068'; g.fillRect(0, 0, w, h); noise(g, w, h, 0.09, 4000);
    for (let i = -4; i < 12; i++) { g.fillStyle = i % 2 ? '#e2b13c' : '#1d1d1d'; g.beginPath(); const y0 = h - 70; g.moveTo(i * 32, h); g.lineTo(i * 32 + 32, h); g.lineTo(i * 32 + 32 + 70, y0); g.lineTo(i * 32 + 70, y0); g.fill(); }
    g.fillStyle = '#3d434a'; g.fillRect(0, h - 74, w, 4);
  });
}
const mats = {};
function makeMats() {
  makeTextures();
  mats.floor = new THREE.MeshStandardMaterial({ map: TEX.floor, roughness: 0.82, metalness: 0.15 });
  mats.wall = new THREE.MeshStandardMaterial({ map: TEX.wall, roughness: 0.75, metalness: 0.25 });
  mats.crate = new THREE.MeshStandardMaterial({ map: TEX.crate, roughness: 0.7, metalness: 0.2 });
  mats.crate2 = new THREE.MeshStandardMaterial({ map: TEX.crate2, roughness: 0.8, metalness: 0.05 });
  mats.pillar = new THREE.MeshStandardMaterial({ map: TEX.pillar, roughness: 0.7, metalness: 0.2 });
  mats.metal = new THREE.MeshStandardMaterial({ color: 0x4c5560, roughness: 0.45, metalness: 0.75 });
  mats.dark = new THREE.MeshStandardMaterial({ color: 0x1c2228, roughness: 0.6, metalness: 0.5 });
  mats.glowB = new THREE.MeshStandardMaterial({ color: 0x0a1a24, emissive: 0x3fb8ff, emissiveIntensity: 1.6 });
  mats.glowO = new THREE.MeshStandardMaterial({ color: 0x241405, emissive: 0xff7a1a, emissiveIntensity: 2.6 });
  mats.glowR = new THREE.MeshStandardMaterial({ color: 0x240505, emissive: 0xff2a2a, emissiveIntensity: 2.8 });
}

// ── 경기장 ─────────────────────────────────────────────
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function uvBox(w, h, d) {             // 크기에 맞춰 UV 를 늘려 텍스처가 찌그러지지 않게
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const su = nx > 0.5 ? d : w, sv = ny > 0.5 ? d : h;
    uv.setXY(i, uv.getX(i) * su / 2, uv.getY(i) * sv / 2);
  }
  return g;
}
const isGlow = (m) => m === mats.glowB || m === mats.glowO || m === mats.glowR;
export function addBox(x, y, z, w, h, d, mat, solid = true, uvScale = true) {
  const m = new THREE.Mesh(uvScale ? uvBox(w, h, d) : boxGeo, mat);
  m.castShadow = m.receiveShadow = !isGlow(mat);
  if (!uvScale) m.scale.set(w, h, d);
  m.position.set(x, y + h / 2, z); G.scene.add(m);
  if (solid) G.boxes.push({ min: new THREE.Vector3(x - w / 2, y, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h, z + d / 2), m });
  return m;
}
export const GATES = [];
export function buildArena() {
  makeMats();
  const H = ARENA.half, WH = ARENA.wallH;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2), mats.floor); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; G.scene.add(fl);
  // 바닥 안전선 (빛나는 띠)
  for (const s of [-1, 1]) { addBox(s * (H - 1.2), 0, 0, 0.12, 0.02, H * 2 - 2.4, mats.glowO, false, false); addBox(0, 0, s * (H - 1.2), H * 2 - 2.4, 0.02, 0.12, mats.glowO, false, false); }
  // 벽 + 출입구 틀
  for (const [x, z, w, d] of [[0, -H - 0.5, H * 2 + 2, 1], [0, H + 0.5, H * 2 + 2, 1], [-H - 0.5, 0, 1, H * 2], [H + 0.5, 0, 1, H * 2]]) {
    const m = addBox(x, 0, z, w, WH, d, mats.wall); m.material = mats.wall;
  }
  // 벽 위쪽 띠 조명 + 지붕 들보
  for (const s of [-1, 1]) {
    addBox(0, WH - 0.6, s * (H - 0.02), H * 2, 0.12, 0.08, mats.glowB, false, false);
    addBox(s * (H - 0.02), WH - 0.6, 0, 0.08, 0.12, H * 2, mats.glowB, false, false);
  }
  for (let i = -2; i <= 2; i++) addBox(i * 9, WH, 0, 0.6, 0.7, H * 2 + 2, mats.dark, false, false);
  for (const z of [-H, H]) addBox(0, WH + 0.7, z, H * 2 + 2, 0.4, 0.6, mats.dark, false, false);
  // 출입구 4곳: 벽에 박힌 문틀 + 경고등 (적이 여기서 나옴)
  for (const [x, z, ry] of [[0, -H, 0], [0, H, Math.PI], [-H, 0, Math.PI / 2], [H, 0, -Math.PI / 2]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; G.scene.add(g);
    const fr = (px, py, w, h, m) => { const b = new THREE.Mesh(boxGeo, m); b.scale.set(w, h, 0.5); b.position.set(px, py, 0.1); b.castShadow = b.receiveShadow = !isGlow(m); g.add(b); return b; };
    fr(0, 2.1, 4.6, 4.2, mats.dark); const door = fr(0, 1.9, 3.8, 3.8, mats.metal); door.position.z = 0.32;
    for (let k = 0; k < 6; k++) { const s = fr(0, 0.5 + k * 0.6, 3.6, 0.06, mats.dark); s.position.z = 0.6; }
    const l1 = fr(-2.15, 2.1, 0.14, 4.0, mats.glowR), l2 = fr(2.15, 2.1, 0.14, 4.0, mats.glowR); l1.position.z = l2.position.z = 0.42;
    const top = fr(0, 4.25, 4.4, 0.16, mats.glowR); top.position.z = 0.42;
    const lamp = new THREE.PointLight(0xff3020, 0, 9, 2); lamp.position.set(0, 3, 1.2); g.add(lamp);
    const spawn = new THREE.Vector3(0, 0, 1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(x, 0, z));
    GATES.push({ g, lamp, spawn, glow: [l1, l2, top], flash: 0 });
  }
  // 가운데 단상 + 계단
  addBox(0, 0, 0, 7, 1.05, 7, mats.metal);
  addBox(0, 1.05, 0, 7.02, 0.06, 7.02, mats.dark, false, false);
  for (const s of [-1, 1]) { addBox(0, 0, s * 4.1, 2.6, 0.35, 1.2, mats.dark); addBox(0, 0, s * 3.85, 2.6, 0.7, 0.7, mats.dark); }
  for (const [x, z] of [[-3.3, -3.3], [3.3, -3.3], [-3.3, 3.3], [3.3, 3.3]]) { addBox(x, 1.05, z, 0.18, 0.9, 0.18, mats.metal, true, false); addBox(x, 1.92, z, 0.22, 0.06, 0.22, mats.glowB, false, false); }
  // 기둥
  for (const [x, z] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
    addBox(x, 0, z, 1.5, WH, 1.5, mats.pillar, true, false);
    addBox(x, 3.2, z, 1.56, 0.1, 1.56, mats.glowO, false, false);
  }
  // 낮은 벽 (몸 숨기기)
  for (const [x, z, w, d] of [[0, -11.5, 5, 0.8], [0, 11.5, 5, 0.8], [-11.5, 0, 0.8, 5], [11.5, 0, 0.8, 5]]) {
    addBox(x, 0, z, w, 1.15, d, mats.metal); addBox(x, 1.15, z, w + 0.06, 0.06, d + 0.06, mats.glowB, false, false);
  }
  // 상자 무더기
  const crate = (x, z, s = 1.6, h = 1.6, two = false, m = mats.crate) => { addBox(x, 0, z, s, h, s, m, true, false); if (two) addBox(x + 0.15, h, z - 0.1, s * 0.85, h * 0.85, s * 0.85, m, true, false); };
  crate(-16, -5, 1.8, 1.8, true); crate(-14.2, -5.6, 1.4, 1.4, false, mats.crate2); crate(16, 5, 1.8, 1.8, true); crate(14.2, 5.6, 1.4, 1.4, false, mats.crate2);
  crate(5, -16, 1.8, 1.8, true, mats.crate2); crate(5.5, -14.2, 1.4, 1.4); crate(-5, 16, 1.8, 1.8, true, mats.crate2); crate(-5.5, 14.2, 1.4, 1.4);
  crate(-17, 17, 2.2, 2.2, true); crate(17, -17, 2.2, 2.2, true); crate(17.5, 17.5, 1.6, 1.6, false, mats.crate2); crate(-17.5, -17.5, 1.6, 1.6, false, mats.crate2);
  crate(-6.5, -7, 1.2, 1.2); crate(7, 6.5, 1.2, 1.2, false, mats.crate2);
  // 벽 쪽 장식: 큰 연료통·선반
  for (const [x, z] of [[-19.5, 8], [19.5, -8], [8, 19.5], [-8, -19.5]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3, 20), mats.metal); t.position.set(x, 1.5, z); t.castShadow = t.receiveShadow = true; G.scene.add(t);
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(1.13, 1.13, 0.16, 20), mats.glowO); b1.position.set(x, 2.4, z); G.scene.add(b1);
    G.boxes.push({ min: new THREE.Vector3(x - 1.1, 0, z - 1.1), max: new THREE.Vector3(x + 1.1, 3, z + 1.1), m: t });
  }
}
// ── 충돌 ───────────────────────────────────────────────
// 원(반지름 r, 높이 y~y+h)과 상자 겹침 → 밀어낼 벡터 (발 높이 위로 step 이하 턱은 무시)
export function collideCircle(p, r, y, h, step = 0.45) {
  let hit = false;
  for (const b of G.boxes) {
    if (b.max.y <= y + step || b.min.y >= y + h) continue;
    const cx = Math.max(b.min.x, Math.min(p.x, b.max.x)), cz = Math.max(b.min.z, Math.min(p.z, b.max.z));
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
      else { // 중심이 상자 안: 가장 가까운 면으로
        const ox = Math.min(p.x - b.min.x, b.max.x - p.x), oz = Math.min(p.z - b.min.z, b.max.z - p.z);
        if (ox < oz) p.x = (p.x - b.min.x < b.max.x - p.x) ? b.min.x - r : b.max.x + r; else p.z = (p.z - b.min.z < b.max.z - p.z) ? b.min.z - r : b.max.z + r;
      }
    }
  }
  const L = ARENA.half - r; p.x = Math.max(-L, Math.min(L, p.x)); p.z = Math.max(-L, Math.min(L, p.z));
  return hit;
}
export function groundAt(x, z, y, r = 0.3, step = 0.45) {
  let g = 0;
  for (const b of G.boxes) {
    if (x + r * 0.6 < b.min.x || x - r * 0.6 > b.max.x || z + r * 0.6 < b.min.z || z - r * 0.6 > b.max.z) continue;
    if (b.max.y <= y + step && b.max.y > g) g = b.max.y;
  }
  return g;
}
// 광선-상자: 가장 가까운 거리 (없으면 Infinity), 경기장 벽·바닥 포함
const _inv = new THREE.Vector3();
export function rayWorld(o, d, maxD = 200) {
  let best = maxD;
  _inv.set(1 / d.x, 1 / d.y, 1 / d.z);
  for (const b of G.boxes) {
    let t1 = (b.min.x - o.x) * _inv.x, t2 = (b.max.x - o.x) * _inv.x; let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
    t1 = (b.min.y - o.y) * _inv.y; t2 = (b.max.y - o.y) * _inv.y; tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
    t1 = (b.min.z - o.z) * _inv.z; t2 = (b.max.z - o.z) * _inv.z; tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
    if (tmax >= Math.max(0, tmin) && tmin < best && tmin > 0) best = tmin;
  }
  if (d.y < -1e-6) { const t = -o.y / d.y; if (t > 0 && t < best) best = t; }
  return best;
}
export function updateGates(dt) {
  for (const g of GATES) {
    g.flash = Math.max(0, g.flash - dt * 1.4);
    const k = 0.35 + g.flash * 2.5 + 0.15 * Math.sin(G.time * 6 + g.spawn.x);
    g.lamp.intensity = g.flash * 22;
    mats.glowR.emissiveIntensity = 2.2 + Math.max(...GATES.map((q) => q.flash)) * 2.5;
  }
}
