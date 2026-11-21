// 효과: 불꽃·폭발 입자, 총알 궤적, 섬광, 적 탄, 데미지 숫자
import * as THREE from 'three';
import { G, rand } from './state.js';

const N = 900;
let pts, pos, col, size, P = [];
const tracers = [], flashes = [];
let flashLight, muzzleLight;
export function initFx() {
  const geo = new THREE.BufferGeometry();
  pos = new Float32Array(N * 3); col = new Float32Array(N * 3); size = new Float32Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { scale: { value: innerHeight * 0.5 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    vertexShader: 'attribute float size; varying vec3 vC; uniform float scale; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vC * a, a); }',
  });
  pts = new THREE.Points(geo, mat); pts.frustumCulled = false; G.scene.add(pts);
  for (let i = 0; i < N; i++) P.push({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color(), s: 0.1, g: 0, drag: 0 });
  const tg = new THREE.BoxGeometry(1, 1, 1); tg.translate(0, 0, -0.5);
  for (let i = 0; i < 28; i++) {
    const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; G.scene.add(m); tracers.push({ m, t: 0 });
  }
  const fg = new THREE.SphereGeometry(1, 16, 12);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; G.scene.add(m); flashes.push({ m, t: 0, max: 0.3, s: 1 });
  }
  flashLight = new THREE.PointLight(0xff8a3a, 0, 16, 2); G.scene.add(flashLight);
  muzzleLight = new THREE.PointLight(0xffc27a, 0, 7, 2); G.scene.add(muzzleLight);
}
export function resizeFx() { if (pts) pts.material.uniforms.scale.value = innerHeight * 0.5; }
let pi = 0;
function emit(p, v, c, s, life, g = 9.8, drag = 1.5) {
  const q = P[pi]; pi = (pi + 1) % N;
  q.p.copy(p); q.v.copy(v); q.c.set(c); q.s = s; q.life = q.max = life; q.g = g; q.drag = drag;
}
const _v = new THREE.Vector3();
export function sparks(p, n = 10, c = 0xffc070, speed = 6, normal = null) {
  for (let i = 0; i < n; i++) {
    _v.set(rand(-1, 1), rand(-0.3, 1), rand(-1, 1)).normalize().multiplyScalar(rand(0.3, 1) * speed);
    if (normal) _v.addScaledVector(normal, speed * 0.6);
    emit(p, _v, c, rand(0.04, 0.09), rand(0.15, 0.4), 12, 2);
  }
}
export function dust(p, n = 6, c = 0x8a8578) {
  for (let i = 0; i < n; i++) { _v.set(rand(-1, 1), rand(0.2, 1.2), rand(-1, 1)).multiplyScalar(1.2); emit(p, _v, c, rand(0.12, 0.25), rand(0.3, 0.6), 2, 3); }
}
export function explosion(p, s = 1, c = 0xff8a30) {
  for (let i = 0; i < 40 * s; i++) { _v.set(rand(-1, 1), rand(-0.5, 1.2), rand(-1, 1)).normalize().multiplyScalar(rand(2, 9) * s); emit(p, _v, i % 3 ? c : 0xffe08a, rand(0.12, 0.3) * s, rand(0.3, 0.8), 6, 2.2); }
  for (let i = 0; i < 14 * s; i++) { _v.set(rand(-1, 1), rand(0.3, 1.5), rand(-1, 1)).multiplyScalar(1.5 * s); emit(p, _v, 0x3a3836, rand(0.5, 0.9) * s, rand(0.8, 1.4), -0.5, 1.2); }
  for (let i = 0; i < 18 * s; i++) { _v.set(rand(-1, 1), rand(0.5, 1.5), rand(-1, 1)).normalize().multiplyScalar(rand(5, 12) * s); emit(p, _v, 0xffd070, 0.05, rand(0.5, 1.1), 14, 0.6); }
  const f = flashes.find((q) => q.t <= 0) || flashes[0];
  f.m.position.copy(p); f.t = f.max = 0.28 + 0.1 * s; f.s = 1.4 * s; f.m.material.color.set(c); f.m.visible = true;
  flashLight.position.copy(p); flashLight.intensity = 60 * s;
  G.shake = Math.max(G.shake, Math.min(0.9, 0.5 * s / (1 + G.camera.position.distanceTo(p) * 0.15)));
}
export function tracer(a, b, def) {
  const t = tracers.find((q) => q.t <= 0) || tracers[0];
  const len = a.distanceTo(b); if (len < 0.3) return;
  t.m.position.copy(a); t.m.lookAt(b);
  const w = def?.tag === 'X' ? 0.035 : def?.tag === 'M' ? 0.02 : 0.014;
  t.m.scale.set(w, w, len); t.t = def?.tag === 'X' ? 0.16 : 0.06; t.max = t.t; t.m.visible = true;
  t.m.material.color.set(def?.tag === 'X' ? 0x9fe0ff : 0xffe2a0);
}
export function muzzle(p) { muzzleLight.position.copy(p); muzzleLight.intensity = 9; }
// 적 탄 (빛나는 구슬)
export const shots = [];
const orbGeo = new THREE.SphereGeometry(1, 12, 8);
export function enemyShot(p, v, dmg, r = 0.12, color = 0xff4a2a, splash = 0) {
  let s = shots.find((q) => !q.alive);
  if (!s) { s = { m: new THREE.Mesh(orbGeo, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending })), p: new THREE.Vector3(), v: new THREE.Vector3() }; G.scene.add(s.m); shots.push(s); }
  s.alive = true; s.p.copy(p); s.v.copy(v); s.dmg = dmg; s.r = r; s.t = 0; s.splash = splash;
  s.m.material.color.set(color); s.m.scale.setScalar(r); s.m.visible = true; s.m.position.copy(p);
  return s;
}
// 데미지 숫자 (화면 위 DOM)
const numsEl = () => document.getElementById('nums');
const nums = []; const _p = new THREE.Vector3();
export function damageNumber(p, v, head) {
  let n = nums.find((q) => q.t <= 0);
  if (!n) { const el = document.createElement('div'); numsEl().appendChild(el); n = { el, t: 0, p: new THREE.Vector3() }; nums.push(n); }
  n.el.textContent = Math.round(v); n.el.className = head ? 'head' : ''; n.t = 0.75; n.p.copy(p); n.dx = rand(-14, 14);
}
export function updateFx(dt) {
  for (let i = 0; i < N; i++) {
    const q = P[i];
    if (q.life > 0) {
      q.life -= dt; q.v.y -= q.g * dt; q.v.multiplyScalar(Math.exp(-q.drag * dt)); q.p.addScaledVector(q.v, dt);
      if (q.p.y < 0.02) { q.p.y = 0.02; q.v.y *= -0.3; q.v.x *= 0.6; q.v.z *= 0.6; }
      const a = Math.max(0, q.life / q.max);
      pos[i * 3] = q.p.x; pos[i * 3 + 1] = q.p.y; pos[i * 3 + 2] = q.p.z;
      col[i * 3] = q.c.r * a; col[i * 3 + 1] = q.c.g * a; col[i * 3 + 2] = q.c.b * a; size[i] = q.s * (0.6 + 0.4 * a);
    } else size[i] = 0;
  }
  pts.geometry.attributes.position.needsUpdate = true; pts.geometry.attributes.color.needsUpdate = true; pts.geometry.attributes.size.needsUpdate = true;
  for (const t of tracers) if (t.t > 0) { t.t -= dt; t.m.material.opacity = Math.max(0, t.t / t.max); if (t.t <= 0) t.m.visible = false; }
  for (const f of flashes) if (f.t > 0) { f.t -= dt; const k = 1 - f.t / f.max; f.m.scale.setScalar(f.s * (0.4 + k * 1.2)); f.m.material.opacity = Math.max(0, 1 - k) * 0.9; if (f.t <= 0) f.m.visible = false; }
  flashLight.intensity *= Math.exp(-dt * 9); muzzleLight.intensity *= Math.exp(-dt * 30);
  for (const n of nums) if (n.t > 0) {
    n.t -= dt; const k = 1 - n.t / 0.75;
    _p.copy(n.p); _p.y += k * 0.6; _p.project(G.camera);
    if (_p.z > 1) { n.el.style.opacity = 0; continue; }
    const x = (_p.x * 0.5 + 0.5) * innerWidth + n.dx * k, y = (-_p.y * 0.5 + 0.5) * innerHeight;
    n.el.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%) scale(${1 + (1 - k) * 0.3})`;
    n.el.style.opacity = Math.min(1, n.t * 4);
    n.el.style.left = '0px'; n.el.style.top = '0px';
  }
}
