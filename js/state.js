// 공유 상태와 작은 도우미
export const G = {
  scene: null, camera: null, renderer: null, vmScene: null, vmCamera: null,
  boxes: [],                 // 충돌 상자 {min:Vector3, max:Vector3}
  time: 0, dt: 0,
  state: 'title',            // title | play | pick | pause | over
  wave: 0, score: 0, kills: 0, heads: 0, best: 0,
  sfx: true, sens: 1,
  touch: matchMedia('(pointer: coarse)').matches,
  shake: 0,
};
export const ARENA = { half: 22, wallH: 8 };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
