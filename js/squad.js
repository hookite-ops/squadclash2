// 분대원: 같이 싸우는 로봇 2명 (전작 SQUAD CLASH 의 R6 아바타 느낌) — 플레이어 근처를 지키며 보이는 적을 끊어 쏜다
import * as THREE from 'three';
import { G, rand, clamp, damp } from './state.js';
import { collideCircle, groundAt, rayWorld } from './world.js';
import { enemies, hitscan } from './enemies.js';
import { tracer, sparks, explosion } from './fx.js';
import { sfxAt } from './audio.js';

export const squad = [];
const NAMES = [['알파', 0x3d9bff], ['브라보', 0xff4d5a]];
let PL = null;
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), ray = new THREE.Ray();
function avatar(col) {
  const g = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.35, metalness: 0.25 });
  const team = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.3, emissive: col, emissiveIntensity: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b2026, roughness: 0.55, metalness: 0.5 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x050a10, emissive: col, emissiveIntensity: 1.8, roughness: 0.2 });
  const box = (w, h, d, m, x, y, z, par = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); par.add(b); return b; };
  const hips = new THREE.Group(); hips.position.y = 0.92; g.add(hips);
  const torso = box(0.62, 0.62, 0.32, armor, 0, 0.33, 0, hips);
  box(0.64, 0.14, 0.34, team, 0, 0.12, 0, hips); box(0.3, 0.2, 0.04, team, 0, 0.42, 0.17, hips);
  const head = new THREE.Group(); head.position.set(0, 0.86, 0); hips.add(head);
  box(0.38, 0.36, 0.36, armor, 0, 0.0, 0, head); box(0.32, 0.12, 0.05, visor, 0, 0.03, 0.18, head); box(0.06, 0.16, 0.06, team, 0.12, 0.25, -0.05, head);
  const limb = (x, y, m) => { const p = new THREE.Group(); p.position.set(x, y, 0); hips.add(p); box(0.29, 0.62, 0.3, m, 0, -0.3, 0, p); box(0.31, 0.12, 0.32, dark, 0, -0.56, 0, p); return p; };
  const armL = limb(-0.46, 0.58, armor), armR = limb(0.46, 0.58, armor);
  const legL = limb(-0.16, -0.02, dark), legR = limb(0.16, -0.02, dark);
  // 소총: 오른팔에 붙임 (앞으로 겨눔)
  const gun = new THREE.Group(); gun.position.set(0, -0.5, 0.18); armR.add(gun);
  box(0.08, 0.12, 0.62, dark, 0, 0, 0.18, gun); box(0.05, 0.05, 0.28, dark, 0, 0.02, 0.58, gun); box(0.06, 0.16, 0.08, team, 0, -0.12, 0.08, gun);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, 0.74); gun.add(muzzle);
  return { g, hips, head, armL, armR, legL, legR, muzzle, mats: [armor, team, dark, visor] };
}
class Mate {
  constructor(i) {
    const [name, col] = NAMES[i]; this.name = name; this.col = col;
    const a = avatar(col); Object.assign(this, a);
    this.p = new THREE.Vector3(i ? 2.2 : -2.2, 1.05, 3.2); this.y = 1.05; this.vy = 0; this.v = new THREE.Vector3();
    this.hp = this.maxHp = 120; this.down = false; this.hitT = 0;
    this.target = null; this.seekT = 0; this.burst = 0; this.shotT = 0; this.coolT = rand(0.3, 1); this.goal = new THREE.Vector3(); this.goalT = 0; this.walk = rand(0, 6); this.ry = Math.PI;
    G.scene.add(this.g);
  }
  hurt(d) {
    if (this.down) return;
    this.hp -= d; this.hitT = 0.08;
    if (this.hp <= 0) { this.hp = 0; this.down = true; this.revT = 0; explosion(V1.copy(this.p).setY(this.y + 1), 0.5, 0x7ac8ff); sfxAt('enemy_destroy', this.p, { vol: 0.7, rate: 1.5 }); G.toast?.(`${this.name} 다운 — 옆에 서 있으면 살릴 수 있어요`); }
  }
  revive() { this.hp = this.maxHp; this.down = false; this.g.rotation.x = 0; }
  update(dt) {
    this.hitT = Math.max(0, this.hitT - dt);
    for (const m of this.mats) if (m.emissive && m !== this.mats[3]) m.emissiveIntensity = this.hitT > 0 ? 1.2 : 0.15;
    if (this.down) {   // 쓰러져 있음: 플레이어가 옆(1.8m)에 2초 서 있으면 일어남
      this.g.rotation.x = damp(this.g.rotation.x, -1.45, 6, dt); this.g.position.set(this.p.x, this.y, this.p.z);
      const near = Math.hypot(PL.pos.x - this.p.x, PL.pos.z - this.p.z) < 1.8 && Math.abs(PL.pos.y - this.y) < 1.2;
      this.revT = near ? (this.revT || 0) + dt : Math.max(0, (this.revT || 0) - dt * 2);
      if (near && Math.random() < dt * 8) sparks(V1.set(this.p.x, this.y + 0.4, this.p.z), 2, 0x7ad0ff, 2);
      if (this.revT > 2) { this.revT = 0; this.revive(); this.hp = this.maxHp * 0.6; G.toast?.(`${this.name} 복귀!`); sfxAt('coin', this.p, { vol: 0.6, rate: 1.1 }); }
      return;
    }
    // 목표 고르기: 보이는 가장 가까운 적 (30m)
    this.seekT -= dt;
    if (this.seekT <= 0) {
      this.seekT = 0.35; this.target = null; let best = 30;
      const eye = V1.set(this.p.x, this.y + 1.55, this.p.z);
      for (const e of enemies) {
        if (!e.alive || !e.hitboxes.length) continue;
        const d = eye.distanceTo(e.hitboxes[0].c); if (d >= best) continue;
        V2.subVectors(e.hitboxes[0].c, eye).normalize();
        if (rayWorld(eye, V2, d) < d - e.hitboxes[0].r) continue;
        best = d; this.target = e;
      }
    }
    // 이동: 플레이어 주변 4~9m 의 자리로, 가끔 자리 바꿈
    this.goalT -= dt;
    const dP = Math.hypot(this.p.x - PL.pos.x, this.p.z - PL.pos.z);
    if (this.goalT <= 0 || dP > 11) {
      this.goalT = rand(2.5, 5);
      const a = PL.yaw + (this.name === '알파' ? 1 : -1) * rand(0.8, 2.2), r = rand(3.5, 7);
      this.goal.set(PL.pos.x - Math.sin(a) * r, 0, PL.pos.z - Math.cos(a) * r);
    }
    const to = V2.set(this.goal.x - this.p.x, 0, this.goal.z - this.p.z); const dg = to.length();
    const sp = dg > 0.6 ? (dP > 9 ? 5.6 : 3.4) : 0;
    if (dg > 0.01) to.multiplyScalar(sp / dg);
    this.v.x = damp(this.v.x, to.x, 8, dt); this.v.z = damp(this.v.z, to.z, 8, dt);
    this.p.x += this.v.x * dt; this.p.z += this.v.z * dt;
    this.vy -= 16 * dt; this.y += this.vy * dt;
    const g = groundAt(this.p.x, this.p.z, this.y + 0.1, 0.35, 0.5); if (this.y < g) { this.y = g; this.vy = 0; }
    if (collideCircle(this.p, 0.4, this.y, 1.9, 0.5) && sp > 0) this.goalT = Math.min(this.goalT, 0.4);
    const spd = Math.hypot(this.v.x, this.v.z); this.walk += dt * spd * 2.8;
    // 몸 방향: 적이 있으면 적, 없으면 걷는 쪽
    let face = spd > 0.3 ? Math.atan2(this.v.x, this.v.z) : this.ry;
    if (this.target) { const c = this.target.hitboxes[0]?.c; if (c) face = Math.atan2(c.x - this.p.x, c.z - this.p.z); }
    let d = face - this.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); this.ry += d * Math.min(1, dt * 9);
    this.g.position.set(this.p.x, this.y, this.p.z); this.g.rotation.y = this.ry;
    const sw = Math.sin(this.walk) * 0.7 * Math.min(1, spd / 3);
    this.legL.rotation.x = sw; this.legR.rotation.x = -sw; this.armL.rotation.x = -sw * 0.6;
    this.hips.position.y = 0.92 + Math.abs(Math.cos(this.walk)) * 0.04 * Math.min(1, spd / 3);
    // 조준 자세: 오른팔을 앞으로 (적이 있으면 높이까지 맞춤)
    let aimP = 1.2;
    if (this.target && this.target.hitboxes[0]) { const c = this.target.hitboxes[0].c; aimP = 1.57 - Math.atan2(c.y - (this.y + 1.5), Math.hypot(c.x - this.p.x, c.z - this.p.z)); }
    this.armR.rotation.x = -damp(-this.armR.rotation.x, aimP, 10, dt);
    if (this.target) this.armL.rotation.x = -1.2;
    // 사격: 짧게 끊어 쏘기
    this.coolT -= dt; this.shotT -= dt;
    if (this.target && this.target.alive && Math.abs(d) < 0.3) {
      if (this.burst <= 0 && this.coolT <= 0) { this.burst = 4 + (Math.random() * 3 | 0); }
      if (this.burst > 0 && this.shotT <= 0) {
        this.burst--; this.shotT = 0.11; if (this.burst === 0) this.coolT = rand(0.5, 1.0);
        const from = this.muzzle.getWorldPosition(new THREE.Vector3());
        const c = this.target.hitboxes[0].c; const dir = V2.subVectors(c, from).normalize();
        dir.x += rand(-1, 1) * 0.045; dir.y += rand(-1, 1) * 0.035; dir.z += rand(-1, 1) * 0.045; dir.normalize();
        ray.set(from, dir);
        const r = hitscan(ray, 9, 0, (e, head, killed) => { if (killed) G.onSquadKill?.(this, e, head); });
        tracer(from, r.point, null);
        sfxAt('blaster', from, { vol: 0.35, rate: 1.25 });
      }
    } else this.burst = 0;
  }
}
export function initSquad(player) { PL = player; for (let i = 0; i < 2; i++) squad.push(new Mate(i)); }
export function resetSquad() {
  squad.forEach((m, i) => { m.revive(); m.p.set(i ? 2.2 : -2.2, 1.05, 3.2); m.y = 1.05; m.v.set(0, 0, 0); m.target = null; m.ry = Math.PI; m.g.position.copy(m.p); });
}
export function reviveSquad() { for (const m of squad) if (m.down) { m.revive(); m.p.set(PL.pos.x + rand(-2, 2), PL.pos.y, PL.pos.z + rand(-2, 2)); m.y = PL.pos.y; } }
export function updateSquad(dt) { for (const m of squad) m.update(dt); }
export function squadAlive() { return squad.filter((m) => !m.down); }
