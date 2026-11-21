// 무기 스킨 — 전작 SQUAD CLASH 와 같은 이름·등급·코드. 총 재질 위에 무늬(위장·호랑이·카본·은하…)와 빛나는 선(회로·균열)을 셰이더로 입힌다.
// 코드는 해시로만 들고 있어 소스에서 읽히지 않는다 (전작 코드가 그대로 통함).
import * as THREE from 'three';
import { store } from './state.js';
export const TIER = { free: ['기본', '#9aa6b6'], rare: ['희귀', '#4aa3ff'], hero: ['영웅', '#b06bff'], legend: ['전설', '#ffcf3f'], limited: ['한정', '#ff8a2a'], ultimate: ['얼티밋', '#ff4d5a'], legendary: ['레전드', 'linear-gradient(90deg,#ff5a66,#ffe07a,#3d9bff)'] };
// mode: 0 그대로 1 색 2 위장 3 줄무늬 4 카본 5 은하 6 그라데이션 · glow: 0 없음 1 회로 2 균열 3 맥동
const c = (r, g, b) => [r, g, b];
export const SKINS = [
  { id: 'std', name: '기본', tier: 'free', mode: 0 },
  { id: 'desert', name: '디지털 사막', tier: 'free', mode: 2, a: c(0.78, 0.66, 0.46), b: c(0.6, 0.5, 0.33), c: c(0.44, 0.36, 0.24), s: 38 },
  { id: 'forest', name: '우드랜드', tier: 'free', mode: 2, a: c(0.34, 0.42, 0.26), b: c(0.2, 0.26, 0.16), c: c(0.44, 0.37, 0.25), s: 34 },
  { id: 'urban', name: '디지털 도심', tier: 'free', mode: 2, a: c(0.62, 0.64, 0.68), b: c(0.36, 0.38, 0.42), c: c(0.18, 0.19, 0.22), s: 40 },
  { id: 'carbon', name: '카본 레드', tier: 'rare', mode: 4, a: c(0.07, 0.07, 0.08), b: c(0.17, 0.17, 0.19), s: 160, metal: 0.45, rough: 0.32, glow: 1, g: c(1, 0.12, 0.15), gi: 1.2, gs: 22 },
  { id: 'tiger', name: '맹호', tier: 'rare', mode: 3, a: c(0.98, 0.52, 0.1), b: c(0.05, 0.04, 0.035), s: 55 },
  { id: 'sakura', name: '벚꽃', tier: 'rare', mode: 2, a: c(1, 0.84, 0.9), b: c(0.96, 0.55, 0.72), c: c(1, 1, 1), s: 30 },
  { id: 'ice', name: '빙결', tier: 'hero', mode: 6, a: c(0.62, 0.86, 1), b: c(0.92, 0.98, 1), s: 18, metal: 0.25, rough: 0.12, glow: 2, g: c(0.5, 0.85, 1), gi: 1.4, gs: 26 },
  { id: 'neon', name: '네온 회로', tier: 'hero', mode: 1, a: c(0.07, 0.08, 0.11), metal: 0.5, rough: 0.3, glow: 1, g: c(0.15, 0.95, 1), gi: 2.6, gs: 30 },
  { id: 'lava', name: '용암', tier: 'hero', mode: 1, a: c(0.09, 0.06, 0.05), rough: 0.6, glow: 2, g: c(1, 0.42, 0.06), gi: 3.2, gs: 22 },
  { id: 'gold', name: '황금', tier: 'legend', mode: 1, a: c(1, 0.77, 0.32), metal: 1, rough: 0.2 },
  { id: 'galaxy', name: '은하', tier: 'legend', mode: 5, a: c(0.1, 0.04, 0.22), b: c(0.42, 0.12, 0.62), s: 26, glow: 3, g: c(0.6, 0.35, 1), gi: 0.25 },
  { id: 'aurora', name: '오로라', tier: 'legend', mode: 6, a: c(0.15, 0.9, 0.68), b: c(0.52, 0.3, 1), s: 14, metal: 0.4, rough: 0.25 },
  { id: 'halloween', name: '할로윈', tier: 'limited', mode: 3, a: c(1, 0.46, 0.04), b: c(0.07, 0.03, 0.09), s: 48, glow: 2, g: c(0.7, 0.2, 1), gi: 1.6, gs: 16 },
  { id: 'platinum', name: '플래티넘 프라임', tier: 'ultimate', mode: 1, a: c(0.9, 0.93, 0.98), metal: 1, rough: 0.13, glow: 1, g: c(0.85, 0.95, 1), gi: 1.2, gs: 18 },
  { id: 'damascus', name: '다마스커스 사무라이', tier: 'ultimate', mode: 3, a: c(0.62, 0.63, 0.68), b: c(0.26, 0.27, 0.31), s: 140, metal: 0.9, rough: 0.28 },
  { id: 'obsidian', name: '흑요석 리퍼', tier: 'ultimate', mode: 1, a: c(0.04, 0.04, 0.05), metal: 0.5, rough: 0.08, glow: 2, g: c(0.62, 0.2, 1), gi: 2.4, gs: 24 },
  { id: 'diamond', name: '다이아몬드 크라운', tier: 'ultimate', mode: 5, a: c(0.78, 0.9, 1), b: c(0.95, 0.98, 1), s: 40, metal: 0.55, rough: 0.05 },
  { id: 'atomic', name: '아토믹 리액터', tier: 'ultimate', mode: 1, a: c(0.09, 0.16, 0.09), metal: 0.6, rough: 0.35, glow: 1, g: c(0.35, 1, 0.3), gi: 2.6, gs: 26 },
  { id: 'orion', name: '오리온 성좌', tier: 'ultimate', mode: 5, a: c(0.04, 0.07, 0.2), b: c(0.12, 0.3, 0.7), s: 30, glow: 3, g: c(0.3, 0.6, 1), gi: 0.6 },
  { id: 'darkmatter', name: '다크 매터 보이드', tier: 'ultimate', mode: 5, a: c(0.02, 0.015, 0.04), b: c(0.18, 0.05, 0.3), s: 22, glow: 3, g: c(0.55, 0.1, 1), gi: 1.6 },
  { id: 'crimson', name: '크림슨 메카', tier: 'legendary', mode: 1, a: c(0.72, 0.07, 0.09), metal: 0.65, rough: 0.28, glow: 1, g: c(1, 0.45, 0.2), gi: 2.4, gs: 20 },
  { id: 'dragon', name: '흑룡', tier: 'legendary', mode: 3, a: c(0.1, 0.1, 0.11), b: c(0.03, 0.03, 0.035), s: 90, metal: 0.7, rough: 0.3, glow: 2, g: c(1, 0.15, 0.08), gi: 2.8, gs: 20 },
  { id: 'phoenix', name: '황금 불사조', tier: 'legendary', mode: 6, a: c(1, 0.78, 0.25), b: c(0.95, 0.18, 0.08), s: 12, metal: 0.85, rough: 0.22, glow: 2, g: c(1, 0.6, 0.1), gi: 2.2, gs: 18 },
  { id: 'aqua', name: '아쿠아 메카', tier: 'legendary', mode: 1, a: c(0.16, 0.66, 0.84), metal: 0.55, rough: 0.25, glow: 1, g: c(0.4, 1, 1), gi: 2.4, gs: 24 },
];
const CODES = {"52f8892199e4ccccf1e390d9":["carbon"],"f2c4a8199d3b999e53db303b":["tiger"],"2ba1b5428900ce62134b5da0":["sakura"],"6e737853de865c743c02fc2a":["ice"],"db635e9296f40f06173f8239":["neon"],"46a788ecdb77f095a24ed9b0":["lava"],"e101b638ea06628fdb448b58":["gold"],"b71cbd8ecb29e1953fe193e3":["galaxy"],"f4568a277f9dcd27833fce13":["aurora"],"6dbf1b00e31d0babcd53dd93":["halloween"],"8e6f6b259e93a5b37fae38bd":["platinum"],"4bdcf361e150a50bdd192f9e":["damascus"],"0fd5c415803db751d06b5b29":["obsidian"],"45f92455cfead62cb14750d1":["diamond"],"c43a4679e5bff78137fb6088":["atomic"],"dde88c5fd63ef241fdf72c98":["orion"],"48dfc5b9f536ff3d5fad9926":["darkmatter"],"a617356c7b837fed8a9990ba":["crimson"],"00b9efaa6d5f8a1cdfa97563":["dragon"],"4c8e81c7ba97ef7da969d69e":["phoenix"],"97c6d25dc6491f81fd5b1062":["aqua"],"19fda097d4176c5754b16890":["crimson","dragon","phoenix","aqua"],"b5d2c01303f1819559ec584d":["platinum","damascus","obsidian","diamond","atomic","orion","darkmatter"],"ffa2dcdf3247a6a0931c95ef":["carbon","tiger","sakura"],"fbacd733ce887e4fdf2769bd":["ice","neon","lava"],"ce4df11b36625f305b6cfb66":"all"};
const KEY_OWN = 'sc2_skins', KEY_EQ = 'sc2_skin';
export function owned() { const s = new Set(SKINS.filter((k) => k.tier === 'free').map((k) => k.id)); try { for (const id of JSON.parse(store.get(KEY_OWN) || '[]')) s.add(id); } catch {} return s; }
export function equipped() { const id = store.get(KEY_EQ) || 'std'; return owned().has(id) ? id : 'std'; }
export function setEquipped(id) { store.set(KEY_EQ, id); }
export async function redeem(code) {
  const n = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 40);
  if (n.length < 6) return null;
  let h;
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sc2:' + n)); h = [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 24); } catch { return null; }
  const v = CODES[h]; if (!v) return null;
  const ids = v === 'all' ? SKINS.map((k) => k.id) : v;
  const own = new Set(JSON.parse(store.get(KEY_OWN) || '[]')); for (const id of ids) own.add(id); store.set(KEY_OWN, JSON.stringify([...own]));
  return ids;
}
// ── 셰이더 ─────────────────────────────────────────────
const GLSL = `
uniform int uMode; uniform int uGlow; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uG; uniform float uS; uniform float uGS; uniform float uGI; uniform float uT;
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
  if (uGlow == 1) { vec3 g = abs(fract(p * uGS) - 0.5); float line = step(0.46, max(g.x, g.z)) * step(0.5, n3(floor(p * uGS) + 3.0)); return uG * uGI * line * (0.75 + 0.25 * sin(uT * 3.0 + p.x * 40.0)); }
  if (uGlow == 2) { float r = abs(n3(p * uGS) - 0.5) * 2.0; return uG * uGI * smoothstep(0.12, 0.0, r) * (0.8 + 0.2 * sin(uT * 2.0 + p.y * 30.0)); }
  if (uGlow == 3) { return uG * uGI * (0.35 + 0.35 * sin(uT * 2.2 + p.x * 12.0 + p.y * 8.0)); }
  return vec3(0.0); }
`;
const U = { uMode: { value: 0 }, uGlow: { value: 0 }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uC: { value: new THREE.Color() }, uG: { value: new THREE.Color() }, uS: { value: 30 }, uGS: { value: 20 }, uGI: { value: 1 }, uT: { value: 0 } };
export function tickSkins(t) { U.uT.value = t; }
function patch(m) {
  if (m.userData.skinned) return; m.userData.skinned = true;
  m.userData.orig = { metal: m.metalness, rough: m.roughness };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vSkinP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkinP = position;');
    sh.fragmentShader = GLSL + sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = skinCol(diffuseColor.rgb, vSkinP);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += skinGlow(vSkinP);');
  };
  m.customProgramCacheKey = () => 'sc2skin';
  m.needsUpdate = true;
}
// 총 재질(이름이 _mat 으로 끝남)에만 적용 — 로봇 손은 그대로
export function applySkin(root, id) {
  const k = SKINS.find((s) => s.id === id) || SKINS[0];
  U.uMode.value = k.mode; U.uGlow.value = k.glow || 0;
  U.uA.value.setRGB(...(k.a || [1, 1, 1])); U.uB.value.setRGB(...(k.b || [1, 1, 1])); U.uC.value.setRGB(...(k.c || [1, 1, 1])); U.uG.value.setRGB(...(k.g || [0, 0, 0]));
  U.uS.value = k.s || 30; U.uGS.value = k.gs || 20; U.uGI.value = k.gi || 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (!/_mat$/.test(m.name || '')) continue;
      patch(m);
      m.metalness = k.metal ?? m.userData.orig.metal; m.roughness = k.rough ?? m.userData.orig.rough;
    }
  });
}
