// 효과음 — Kenney CC0 음원(assets/sfx)을 피치·음량을 바꿔 재활용 + 총성은 짧은 화약 폭음(잡음)을 겹쳐 무기마다 다르게
import { G } from './state.js';
let ctx = null, master = null, noiseBuf = null;
const buf = {};
const FILES = ['blaster', 'coin', 'enemy_attack', 'enemy_destroy', 'enemy_hurt', 'impact', 'jump_a', 'land', 'toggle', 'weapon_change'];
export async function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); master.disconnect(); master.connect(comp); comp.connect(ctx.destination);
  await Promise.all(FILES.map(async (f) => {
    try { const r = await fetch(`assets/sfx/${f}.ogg`); buf[f] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch {}
  }));
  const n = Math.ceil(ctx.sampleRate * 0.5); noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
}
export function suspendAudio(on) { if (!ctx) return; on ? ctx.suspend() : ctx.resume(); }
export function sfx(name, { vol = 1, rate = 1, jitter = 0.06, pan = 0, delay = 0 } = {}) {
  if (!ctx || !G.sfx || !buf[name]) return;
  const s = ctx.createBufferSource(); s.buffer = buf[name];
  s.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
  const g = ctx.createGain(); g.gain.value = vol; let node = g;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  s.connect(g); node.connect(master); s.start(ctx.currentTime + delay);
}
export function sfxAt(name, pos, opts = {}) {
  if (!G.camera) return sfx(name, opts);
  const c = G.camera.position, dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, pos.y - c.y, dz);
  const vol = (opts.vol ?? 1) * Math.min(1, 7 / (d + 3)); if (vol < 0.03) return;
  const yaw = G.yaw || 0, rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const pan = Math.max(-0.8, Math.min(0.8, (dx * rx + dz * rz) / (d + 0.01)));
  sfx(name, { ...opts, vol, pan });
}
// 총성: size(0.5 권총 ~ 2 대구경), tone(높을수록 날카로움), supp(소음기)
export function gunshot({ size = 1, tone = 1, supp = false } = {}) {
  if (!ctx || !G.sfx || !noiseBuf) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = (supp ? 0.7 : 1) * (0.9 + Math.random() * 0.2);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(supp ? 1400 : 5200 * tone, t); f.frequency.exponentialRampToValueAtTime(supp ? 300 : 500, t + 0.12 + size * 0.08);
  const g = ctx.createGain(); const v = (supp ? 0.35 : 0.85) * Math.min(1.2, 0.55 + size * 0.35);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + (supp ? 0.12 : 0.16 + size * 0.14));
  src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + 0.5);
  const o = ctx.createOscillator(), og = ctx.createGain();      // 몸통을 치는 저음
  o.frequency.setValueAtTime((supp ? 90 : 120) / Math.sqrt(size), t); o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
  og.gain.setValueAtTime(supp ? 0.25 : 0.55 * Math.min(1.4, size), t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.2 + size * 0.06);
  o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.35);
  if (buf.blaster) sfx('blaster', { vol: supp ? 0.12 : 0.22, rate: 0.55 * tone / Math.sqrt(size), jitter: 0.05 });
}
// 기계음(장전·볼트): 애니메이션 박자에 맞춰
const MECH = { click: ['toggle', 1.6, 0.35], clunk: ['impact', 0.75, 0.55], slide: ['weapon_change', 1.15, 0.4], shell: ['coin', 2.2, 0.12] };
export function mech(kind, delay = 0) { const m = MECH[kind]; if (m) sfx(m[0], { rate: m[1], vol: m[2], delay }); }
