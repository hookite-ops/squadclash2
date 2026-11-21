// 기계 부대: 정찰 드론(날며 쏨) · 크롤러(달려들어 할큄) · 보행 전차(포격, 눈이 약점) + 적 탄
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { G, rand, clamp, damp, ARENA } from './state.js';
import { collideCircle, groundAt, rayWorld, GATES } from './world.js';
import { sparks, explosion, enemyShot, shots, dust, damageNumber } from './fx.js';
import { sfx, sfxAt } from './audio.js';

export const enemies = [];
const models = {};
export async function loadEnemyModels() {
  const l = new GLTFLoader();
  for (const k of ['drone', 'walker']) {
    const g = await l.loadAsync(`assets/models/${k}.glb`); models[k] = g.scene;
  }
}
function cloneModel(k) {
  const m = SkeletonUtils.clone(models[k]); const mats = [];
  m.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); mats.push(o.material); } });
  return { m, mats };
}
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
let PL = null, SQ = [];   // 플레이어·분대원 (main 에서 연결)
export function bindPlayer(p) { PL = p; }
export function bindSquad(list) { SQ = list; }
const hp = (base) => base * (1 + (G.wave - 1) * 0.12);

class Enemy {
  constructor(maxHp, points) { this.hp = this.maxHp = maxHp; this.points = points; this.alive = true; this.hitT = 0; this.stun = 0; this.mats = []; this.hitboxes = []; this.p = new THREE.Vector3(); this.v = new THREE.Vector3(); }
  tickFlash(dt) {
    this.hitT = Math.max(0, this.hitT - dt);
    for (const m of this.mats) if (m.emissive) { if (m.userData.e0 === undefined) m.userData.e0 = m.emissive.getHex(), m.userData.ei = m.emissiveIntensity; m.emissive.setHex(this.hitT > 0 ? 0xffffff : m.userData.e0); m.emissiveIntensity = this.hitT > 0 ? 0.9 : (this.stun > 0 ? m.userData.ei * (0.4 + 0.6 * Math.abs(Math.sin(G.time * 30))) : m.userData.ei); }
  }
  damage(d, head, at) {
    if (!this.alive) return false;
    this.hp -= d; this.hitT = 0.06;
    damageNumber(at, d, head);
    if (this.hp <= 0) { this.alive = false; this.die(head); return true; }
    return false;
  }
}
// ── 정찰 드론 ──────────────────────────────────────────
class Drone extends Enemy {
  constructor(at, elite) {
    super(hp(elite ? 70 : 42), elite ? 160 : 100);
    const { m, mats } = cloneModel('drone'); this.m = m; this.mats = mats; m.scale.setScalar(elite ? 1.15 : 0.95);
    if (elite) for (const mt of mats) if (mt.emissive) mt.emissive.setHex(0xff6a00);
    this.p.copy(at).add(V1.set(0, 2.6, 0)); this.elite = elite;
    this.rotors = [0, 1, 2, 3].map((k) => m.getObjectByName('Rotor' + k)).filter(Boolean);
    this.ph = rand(0, 6); this.fireT = rand(1.4, 2.4); this.orbitDir = Math.random() < 0.5 ? -1 : 1; this.alt = rand(2.6, 4.6); this.rad = rand(7, 11);
    this.hitboxes = [{ c: this.p, r: 0.55, mult: 1 }];
    G.scene.add(m);
  }
  update(dt) {
    this.tickFlash(dt); this.stun = Math.max(0, this.stun - dt);
    const tp = V1.copy(PL.pos); tp.y += 1.4;
    const to = V2.subVectors(this.p, tp); to.y = 0; const d = to.length() || 1;
    // 플레이어 둘레를 돌며 거리 유지 + 가끔 고도 바꿈
    const tang = V3.set(-to.z, 0, to.x).multiplyScalar(this.orbitDir / d);
    const want = new THREE.Vector3().copy(to).multiplyScalar((this.rad - d) / d * 1.6).addScaledVector(tang, this.elite ? 6.5 : 4.5);
    want.y = (tp.y + this.alt + Math.sin(G.time * 1.3 + this.ph) * 0.8 - this.p.y) * 2;
    if (this.stun > 0) { want.multiplyScalar(0.1); want.y = -2; }
    this.v.lerp(want, Math.min(1, dt * 2)); this.p.addScaledVector(this.v, dt);
    this.p.y = Math.max(1.2, Math.min(ARENA.wallH - 1, this.p.y));
    const L = ARENA.half - 1; this.p.x = clamp(this.p.x, -L, L); this.p.z = clamp(this.p.z, -L, L);
    if (Math.random() < dt * 0.25) this.orbitDir *= -1;
    this.m.position.copy(this.p);
    this.m.rotation.set(-this.v.z * 0.04, Math.atan2(-(tp.x - this.p.x), -(tp.z - this.p.z)), this.v.x * 0.04);
    for (const r of this.rotors) r.rotation.y += dt * 45;
    // 사격: 보이면 예측해서 쏨
    this.fireT -= dt;
    if (this.fireT <= 0 && this.stun <= 0) {
      this.fireT = (this.elite ? rand(1.1, 1.6) : rand(1.7, 2.6)) / Math.min(1.6, 1 + G.wave * 0.04);
      const dirv = V2.subVectors(tp, this.p); const dist = dirv.length(); dirv.normalize();
      if (rayWorld(this.p, dirv, dist) >= dist - 0.5) {
        const lead = V3.copy(PL.vel).multiplyScalar(dist / 16 * 0.6);
        const aim = V1.copy(tp).add(lead).sub(this.p).normalize().multiplyScalar(this.elite ? 19 : 15);
        enemyShot(this.p.clone(), aim, this.elite ? 10 : 7, 0.11, this.elite ? 0xff8a1a : 0xff3a2a);
        sfxAt('enemy_attack', this.p, { vol: 0.5, rate: 1.6 });
      }
    }
  }
  die(head) {
    explosion(this.p.clone(), 0.7, this.elite ? 0xff9a2a : 0xff6a30); sfxAt('enemy_destroy', this.p, { vol: 0.9, rate: 1.3 });
    G.scene.remove(this.m); this.remove = true; this.hitboxes = [];
  }
}
// ── 크롤러 (절차 모델) ─────────────────────────────────
const CR = {};
function crawlerMesh(elite) {
  if (!CR.body) {
    CR.armor = new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.45, metalness: 0.7 });
    CR.dark = new THREE.MeshStandardMaterial({ color: 0x15191d, roughness: 0.6, metalness: 0.5 });
    CR.body = new THREE.SphereGeometry(0.5, 18, 12); CR.leg = new THREE.CylinderGeometry(0.06, 0.04, 0.75, 8); CR.eye = new THREE.SphereGeometry(0.16, 14, 10);
    CR.plate = new THREE.BoxGeometry(0.75, 0.12, 0.6);
  }
  const g = new THREE.Group(); const mats = [];
  const armor = CR.armor.clone(); const dark = CR.dark.clone(); mats.push(armor, dark);
  if (elite) armor.color.setHex(0x6a3a1c);
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: elite ? 0xff8a00 : 0xff1a1a, emissiveIntensity: 3 }); mats.push(eyeM);
  const body = new THREE.Mesh(CR.body, armor); body.scale.set(1, 0.62, 1.15); body.position.y = 0.62; g.add(body);
  const plate = new THREE.Mesh(CR.plate, dark); plate.position.set(0, 0.92, -0.05); g.add(plate);
  const eye = new THREE.Mesh(CR.eye, eyeM); eye.position.set(0, 0.72, 0.5); g.add(eye);
  const legs = [];
  for (const [x, z] of [[-0.42, 0.3], [0.42, 0.3], [-0.42, -0.32], [0.42, -0.32]]) {
    const hip = new THREE.Group(); hip.position.set(x, 0.6, z); g.add(hip);
    const leg = new THREE.Mesh(CR.leg, dark); leg.position.set(Math.sign(x) * 0.22, -0.2, 0); leg.rotation.z = Math.sign(x) * 0.9; hip.add(leg);
    const foot = new THREE.Mesh(CR.leg, armor); foot.position.set(Math.sign(x) * 0.48, -0.42, 0); foot.rotation.z = -Math.sign(x) * 0.25; hip.add(foot);
    legs.push(hip);
  }
  return { g, mats, eye, legs, body };
}
class Crawler extends Enemy {
  constructor(at, elite) {
    super(hp(elite ? 95 : 58), elite ? 120 : 80);
    const c = crawlerMesh(elite); this.m = c.g; this.mats = c.mats; this.eye = c.eye; this.legs = c.legs; this.bodyM = c.body; this.elite = elite;
    if (elite) this.m.scale.setScalar(1.15);
    this.p.copy(at); this.y = 0; this.vy = 0; this.atkT = 0; this.leap = 0; this.speed = (elite ? 7.4 : 5.6) * rand(0.9, 1.1); this.walk = rand(0, 6);
    this.hitboxes = [{ c: new THREE.Vector3(), r: 0.55 * (elite ? 1.15 : 1), mult: 1 }, { c: new THREE.Vector3(), r: 0.2, mult: 2 }];
    this.side = Math.random() < 0.5 ? -1 : 1;
    G.scene.add(this.m);
  }
  update(dt) {
    this.tickFlash(dt); this.stun = Math.max(0, this.stun - dt); this.atkT = Math.max(0, this.atkT - dt);
    // 목표: 기본은 플레이어, 분대원이 훨씬 가까우면 분대원
    let tgt = PL, tp = PL.pos, ty = PL.pos.y, best = Math.hypot(PL.pos.x - this.p.x, PL.pos.z - this.p.z) - 2.5;
    for (const m of SQ) { if (m.down) continue; const dm = Math.hypot(m.p.x - this.p.x, m.p.z - this.p.z); if (dm < best) { best = dm; tgt = m; tp = m.p; ty = m.y; } }
    const to = V1.set(tp.x - this.p.x, 0, tp.z - this.p.z); const d = to.length() || 1; to.multiplyScalar(1 / d);
    let sp = this.speed * (this.stun > 0 ? 0 : 1);
    // 막히면 옆으로 비켜 돌아감
    const ahead = V2.copy(to); const blocked = rayWorld(V3.set(this.p.x, this.y + 0.5, this.p.z), ahead, 1.6) < 1.5;
    if (blocked) ahead.set(-to.z * this.side, 0, to.x * this.side).lerp(to, 0.25).normalize();
    if (d > 2.2) this.v.lerp(ahead.multiplyScalar(sp), Math.min(1, dt * 6)); else this.v.multiplyScalar(Math.exp(-dt * 8));
    // 도약: 3~5m 에서 뛰어듦
    if (this.leap <= 0 && d < 5 && d > 2.4 && this.stun <= 0 && Math.random() < dt * 1.5 && this.y < 0.05) { this.leap = 0.5; this.vy = 4.2; this.v.copy(to).multiplyScalar(9); sfxAt('jump_a', this.p, { vol: 0.5, rate: 1.6 }); }
    this.leap -= dt;
    this.p.addScaledVector(this.v, dt);
    this.vy -= 18 * dt; this.y += this.vy * dt;
    const g = groundAt(this.p.x, this.p.z, this.y + 0.2, 0.4);
    if (this.y < g) { this.y = g; this.vy = 0; }
    collideCircle(this.p, 0.5, this.y, 1, 0.45);
    // 다른 크롤러와 겹치지 않게
    for (const e of enemies) if (e !== this && e instanceof Crawler && e.alive) { const dx = this.p.x - e.p.x, dz = this.p.z - e.p.z, dd = dx * dx + dz * dz; if (dd < 1.1 && dd > 1e-6) { const k = (1.05 - Math.sqrt(dd)) * 0.5 / Math.sqrt(dd); this.p.x += dx * k; this.p.z += dz * k; } }
    this.m.position.set(this.p.x, this.y, this.p.z);
    this.m.rotation.y = Math.atan2(to.x, to.z);
    const spd = this.v.length(); this.walk += dt * spd * 2.6;
    this.legs.forEach((l, i) => { l.rotation.x = Math.sin(this.walk + (i % 3 ? Math.PI : 0)) * 0.6 * Math.min(1, spd / 3); });
    this.bodyM.position.y = 0.62 + Math.abs(Math.sin(this.walk)) * 0.05;
    if (spd > 3 && Math.random() < dt * 6) dust(V3.set(this.p.x, 0.05, this.p.z), 2);
    // 할퀴기
    if (d < 1.5 && this.atkT <= 0 && this.stun <= 0 && Math.abs(ty - this.y) < 1.4) {
      this.atkT = 0.95; tgt.hurt(this.elite ? 15 : 11, this.p); sfxAt('enemy_hurt', this.p, { vol: 0.7, rate: 0.8 });
    }
    this.m.updateMatrixWorld();
    this.hitboxes[0].c.set(this.p.x, this.y + 0.62 * this.m.scale.y, this.p.z);
    this.eye.getWorldPosition(this.hitboxes[1].c);
  }
  die(head) {
    const at = this.hitboxes[0].c.clone();
    explosion(at, 0.55, this.elite ? 0xffa030 : 0xff5a2a); sfxAt('enemy_destroy', at, { vol: 0.8, rate: 1.1 });
    G.scene.remove(this.m); this.remove = true; this.hitboxes = [];
  }
}
// ── 보행 전차 ──────────────────────────────────────────
class Walker extends Enemy {
  constructor(at, boss = false) {
    super(hp(boss ? 1500 : 460), boss ? 2000 : 450);
    const { m, mats } = cloneModel('walker'); this.m = m; this.mats = mats; m.scale.setScalar(boss ? 1.3 : 0.85); this.boss = boss;
    if (boss) for (const mt of mats) if (mt.color && mt.name === 'Rust') mt.color.setHex(0x5a2a1c);
    this.p.copy(at); this.t = rand(0, 3); this.fireT = 2.5;
    this.body = m.getObjectByName('Body'); this.hips = [m.getObjectByName('HipL'), m.getObjectByName('HipR')]; this.eyeN = m.getObjectByName('eye');
    this.cannon = m.getObjectByName('Cannon');
    const sc = boss ? 1.3 / 0.85 : 1;
    this.hitboxes = [{ c: new THREE.Vector3(), r: 1.1 * sc, mult: 1 }, { c: new THREE.Vector3(), r: 0.32 * sc, mult: 2.5 }];
    G.scene.add(m);
    sfxAt('impact', this.p, { vol: 1, rate: 0.5 });
    if (boss) G.toast?.('⚠ 철갑 거상 출현! 빨간 눈을 노려라');
  }
  update(dt) {
    this.tickFlash(dt); this.stun = Math.max(0, this.stun - dt); this.t += dt;
    const to = V1.subVectors(PL.pos, this.p); to.y = 0; const d = to.length() || 1; to.multiplyScalar(1 / d);
    const sp = (d > 11 ? 1.7 : d < 7 ? -0.8 : 0) * (this.stun > 0 ? 0 : 1);
    this.p.addScaledVector(to, sp * dt);
    collideCircle(this.p, 1.2, 0, 3, 0.45);
    const step = this.t * 3.2 * (Math.abs(sp) > 0.1 ? 1 : 0.2);
    if (this.hips[0]) { this.hips[0].rotation.x = Math.sin(step) * 0.4; this.hips[1].rotation.x = -Math.sin(step) * 0.4; }
    this.m.position.set(this.p.x, Math.abs(Math.cos(step)) * 0.1, this.p.z);
    this.m.rotation.y = Math.atan2(to.x, to.z) + Math.PI;
    if (Math.abs(sp) > 0.1 && Math.random() < dt * 4) dust(V3.set(this.p.x + rand(-1, 1), 0.1, this.p.z + rand(-1, 1)), 3);
    this.m.updateMatrixWorld();
    (this.body || this.m).getWorldPosition(this.hitboxes[0].c);
    if (this.eyeN) this.eyeN.getWorldPosition(this.hitboxes[1].c); else this.hitboxes[1].c.copy(this.hitboxes[0].c).add(V3.set(0, 0.8, 0));
    // 포격: 큰 탄 (터지면 주변 피해)
    this.fireT -= dt;
    if (this.fireT <= 0 && this.stun <= 0) {
      this.fireT = rand(2.8, 3.6);
      const from = (this.cannon ? this.cannon.getWorldPosition(new THREE.Vector3()) : this.hitboxes[0].c.clone().add(V3.set(0, 0.4, 0)));
      const tp = V2.copy(PL.pos); tp.y += 1.1; const dirv = tp.sub(from); const dist = dirv.length(); dirv.normalize();
      if (rayWorld(from, dirv, dist) >= dist - 0.6) {
        const n = this.boss ? 3 : 1;
        for (let k = 0; k < n; k++) { const dv = dirv.clone().applyAxisAngle(V3.set(0, 1, 0), (k - (n - 1) / 2) * 0.12); enemyShot(from.clone(), dv.multiplyScalar(13), 22, 0.26, 0xff7a10, 2.6); }
        sfxAt('blaster', from, { vol: 0.9, rate: 0.5 });
      }
      else this.fireT = 0.8;
    }
  }
  die(head) {
    const at = this.hitboxes[0].c.clone();
    explosion(at, this.boss ? 2.4 : 1.6); sfxAt('enemy_destroy', at, { vol: 1.2, rate: 0.6 });
    if (this.boss) { for (let k = 0; k < 3; k++) dropOrb(at.clone().add(V3.set(rand(-2, 2), 0, rand(-2, 2)))); G.toast?.('철갑 거상 격파!'); }
    setTimeout(() => explosion(at.clone().add(V3.set(rand(-1, 1), -0.8, rand(-1, 1))), 1.1), 260);
    G.scene.remove(this.m); this.remove = true; this.hitboxes = [];
  }
}
export function spawn(kind, gate, elite = false) {
  const gt = GATES[gate % GATES.length]; gt.flash = 1;
  const at = gt.spawn.clone().add(V1.set(rand(-1.2, 1.2), 0, rand(-1.2, 1.2)));
  const e = kind === 'drone' ? new Drone(at, elite) : kind === 'walker' ? new Walker(at, elite) : new Crawler(at, elite);
  enemies.push(e); return e;
}
export function updateEnemies(dt) {
  for (const e of enemies) if (e.alive) e.update(dt);
  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].remove) enemies.splice(i, 1);
  // 적 탄
  for (const s of shots) {
    if (!s.alive) continue;
    s.t += dt; const step = s.v.length() * dt; const dirv = V1.copy(s.v).normalize();
    const wall = rayWorld(s.p, dirv, step + s.r);
    const np = V2.copy(s.p).addScaledVector(s.v, dt);
    // 플레이어 (몸통 캡슐 근사)
    const pc = V3.set(PL.pos.x, clamp(np.y, PL.pos.y + 0.3, PL.pos.y + 1.6), PL.pos.z);
    if (np.distanceTo(pc) < 0.45 + s.r) { PL.hurt(s.dmg, s.p); burst(s, np); continue; }
    let hitM = null; for (const m of SQ) { if (m.down) continue; if (Math.hypot(np.x - m.p.x, np.z - m.p.z) < 0.42 + s.r && np.y > m.y && np.y < m.y + 1.9) { hitM = m; break; } }
    if (hitM) { hitM.hurt(s.dmg * 0.8); burst(s, np); continue; }
    if (wall < step + s.r || s.t > 4) { burst(s, s.p.clone().addScaledVector(dirv, Math.min(wall, step))); continue; }
    s.p.copy(np); s.m.position.copy(np);
    s.m.scale.setScalar(s.r * (1 + 0.15 * Math.sin(s.t * 40)));
  }
}
function burst(s, at) {
  s.alive = false; s.m.visible = false;
  sparks(at, 8, s.splash ? 0xff8a20 : 0xff5030, 4);
  if (s.splash) { explosion(at, 0.8, 0xff7a10); const d = at.distanceTo(V1.copy(PL.pos).setY(PL.pos.y + 1)); if (d < s.splash) PL.hurt(s.dmg * 0.6 * (1 - d / s.splash), at); }
}
// 히트스캔: 광선이 맞힌 가장 가까운 적(관통 n) / 벽
const _sc = new THREE.Vector3();
export function hitscan(ray, dmg, pierce, onHit) {
  const wallD = rayWorld(ray.origin, ray.direction, 120);
  const cands = [];
  for (const e of enemies) {
    if (!e.alive) continue;
    let best = null;
    for (const h of e.hitboxes) {
      _sc.subVectors(h.c, ray.origin); const tca = _sc.dot(ray.direction); if (tca < 0) continue;
      const d2 = _sc.lengthSq() - tca * tca, r2 = h.r * h.r; if (d2 > r2) continue;
      const t = tca - Math.sqrt(r2 - d2);
      if (t < wallD && (!best || t < best.t || (h.mult > 1 && Math.abs(t - best.t) < 0.3))) best = { t, e, h };
    }
    if (best) cands.push(best);
  }
  cands.sort((a, b) => a.t - b.t);
  const hits = cands.slice(0, 1 + pierce);
  for (const c of hits) {
    const at = ray.at(c.t, new THREE.Vector3()); const head = c.h.mult > 1;
    const killed = c.e.damage(dmg * c.h.mult, head, at);
    sparks(at, head ? 12 : 7, head ? 0xffe070 : 0xffa050, 5);
    onHit?.(c.e, head, killed, at);
  }
  const end = hits.length && !pierce ? hits[0].t : wallD;
  const point = ray.at(Math.min(end, 120), new THREE.Vector3());
  if (!hits.length || pierce) { if (wallD < 120) sparks(ray.at(wallD - 0.02, new THREE.Vector3()), 5, 0xffd090, 3.5); }
  return { point, hits };
}
// 조준 보조 대상
const _tg = [];
export function assistTargets(cam) {
  _tg.length = 0;
  for (const e of enemies) {
    if (!e.alive || !e.hitboxes.length) continue;
    const h = e.hitboxes[0]; const dv = V1.subVectors(h.c, cam); const d = dv.length(); if (d > 60) continue;
    dv.multiplyScalar(1 / d); if (rayWorld(cam, dv, d) < d - h.r) continue;
    _tg.push({ x: h.c.x, y: h.c.y, z: h.c.z, r: h.r, ref: e });
  }
  return _tg;
}
export function stunAll(center, r, t) {
  let n = 0;
  for (const e of enemies) if (e.alive && e.p.distanceTo(center) < r) { e.stun = t; n++; if (e instanceof Drone) e.damage(25, false, e.p.clone()); }
  return n;
}
// 회복 구슬: 처치 때 가끔 떨어짐 → 밟으면 체력 +30
const orbs = []; const orbGeo2 = new THREE.IcosahedronGeometry(0.22, 1);
const orbMat = new THREE.MeshStandardMaterial({ color: 0x0a2a14, emissive: 0x3dff8a, emissiveIntensity: 2.4, roughness: 0.3 });
export function dropOrb(at) {
  const m = new THREE.Mesh(orbGeo2, orbMat); m.position.set(at.x, 0.6, at.z); G.scene.add(m); orbs.push({ m, t: 0 });
}
export function updateOrbs(dt) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i]; o.t += dt; o.m.rotation.y += dt * 2; o.m.position.y = 0.55 + Math.sin(o.t * 3) * 0.12;
    const d = Math.hypot(o.m.position.x - PL.pos.x, o.m.position.z - PL.pos.z);
    if (d < 1.1 && Math.abs(PL.pos.y - 0.4) < 1.6 && PL.hp < PL.maxHp) { PL.hp = Math.min(PL.maxHp, PL.hp + 30); sfx('coin', { vol: 0.6, rate: 1.4 }); sparks(o.m.position, 14, 0x3dff8a, 4); G.scene.remove(o.m); orbs.splice(i, 1); continue; }
    if (o.t > 18) { G.scene.remove(o.m); orbs.splice(i, 1); }
  }
}
export function clearEnemies() {
  for (const o of orbs) G.scene.remove(o.m); orbs.length = 0;
  for (const e of enemies) G.scene.remove(e.m);
  enemies.length = 0; for (const s of shots) { s.alive = false; s.m.visible = false; }
}
export const alive = () => enemies.filter((e) => e.alive).length;
