// 플레이어: 이동(조이스틱·WASD)·점프·충돌 + 시점(드래그·마우스·자이로) + 체력·EMP
import * as THREE from 'three';
import { G, clamp, damp, lerp } from './state.js';
import { collideCircle, groundAt } from './world.js';
import { W, updateWeapons, reload, swap } from './weapons.js';
import { sfx } from './audio.js';
import { explosion, sparks } from './fx.js';
import { stunAll } from './enemies.js';

export const P = {
  pos: new THREE.Vector3(0, 1.05, 2.5), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: true,
  hp: 100, maxHp: 100, regenT: 0, empT: 0, empCd: 12, dead: false, hurtT: 0, lookVel: { x: 0, y: 0 },
  hurt(d, from) {
    if (this.dead || G.state !== 'play') return;
    this.hp -= d; this.regenT = 3.5; this.hurtT = 1;
    if (from) { this.hurtFrom = { x: from.x, z: from.z }; this.hurtDirT = 1.2; }
    G.shake = Math.max(G.shake, Math.min(0.8, d * 0.03));
    sfx('enemy_hurt', { vol: 0.6, rate: 0.6 });
    G.controls?.haptic('hurt');
    if (this.hp <= 0) { this.hp = 0; this.dead = true; G.onDeath?.(); }
  },
};
G.player = P;
const keys = {};
let mouseFire = false, mouseAds = false, mdx = 0, mdy = 0;
export function initInput(canvas) {
  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (G.state !== 'play') return;
    if (e.code === 'KeyR') reload();
    if (e.code === 'KeyQ' || e.code === 'Digit1' || e.code === 'Digit2') swap();
    if (e.code === 'KeyE') emp();
    if (e.code === 'Space') jump();
    if (e.code === 'Escape' || e.code === 'KeyP') G.pause?.();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  canvas.addEventListener('mousedown', (e) => {
    if (G.state !== 'play' || G.touch) return;
    if (!document.pointerLockElement) { canvas.requestPointerLock?.(); return; }
    if (e.button === 0) mouseFire = true; if (e.button === 2) mouseAds = true;
  });
  addEventListener('mouseup', (e) => { if (e.button === 0) mouseFire = false; if (e.button === 2) mouseAds = false; });
  addEventListener('mousemove', (e) => { if (document.pointerLockElement) { mdx += e.movementX; mdy += e.movementY; } });
  addEventListener('wheel', () => { if (G.state === 'play') swap(); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.state === 'play' && !G.touch) G.pause?.(); });
}
export function jump() { if (P.onGround && !P.dead) { P.vel.y = 5.4; P.onGround = false; sfx('jump_a', { vol: 0.35, rate: 1.1 }); } }
export function emp() {
  if (P.empT > 0 || P.dead) return;
  P.empT = P.empCd;
  const c = P.pos.clone(); c.y += 1;
  const n = stunAll(c, 11, 3.2);
  explosion(c.clone().add(new THREE.Vector3(0, -0.6, 0)), 0.9, 0x4ab8ff); sparks(c, 40, 0x7ad0ff, 11);
  sfx('blaster', { vol: 0.8, rate: 0.35 }); sfx('toggle', { vol: 0.5, rate: 0.6 });
  G.toast?.(n ? `EMP · ${n}기 정지` : 'EMP');
}
export function resetPlayer() {
  P.pos.set(0, 1.05, 2.4); P.vel.set(0, 0, 0); P.yaw = 0; P.pitch = 0; P.hp = P.maxHp; P.dead = false; P.empT = 0; P.regenT = 0; P.hurtT = 0;
}
const fwd = new THREE.Vector3(), rgt = new THREE.Vector3(), qYaw = new THREE.Quaternion(), qPitch = new THREE.Quaternion(), qRec = new THREE.Euler(0, 0, 0, 'YXZ'), qTmp = new THREE.Quaternion();
const AX_Y = new THREE.Vector3(0, 1, 0), AX_X = new THREE.Vector3(1, 0, 0);
let bobT = 0, landT = 0;
export function updatePlayer(dt) {
  const cam = G.camera;
  // 입력 모으기
  const view = { pos: cam.position, yaw: P.yaw, pitch: P.pitch, fov: cam.fov, baseFov: 72, adsAmt: W.adsAmt, moving: P.vel.lengthSq() > 1, sprinting: P.sprint };
  const c = G.controls && G.touch ? G.controls.update(dt, view) : null;
  let mx = 0, my = 0, fire = mouseFire, ads = mouseAds, sprint = keys.ShiftLeft || keys.ShiftRight;
  if (keys.KeyW) my += 1; if (keys.KeyS) my -= 1; if (keys.KeyA) mx -= 1; if (keys.KeyD) mx += 1;
  let dyaw = -mdx * 0.0022 * G.sens * lerp(1, 0.55, W.adsAmt), dpitch = -mdy * 0.0022 * G.sens * lerp(1, 0.55, W.adsAmt); mdx = mdy = 0;
  if (c) {
    mx += c.move.x; my += c.move.y; dyaw += c.dyaw; dpitch += c.dpitch; fire = fire || c.fire; ads = ads || c.ads; sprint = sprint || c.sprint;
    for (const ev of c.events) { if (ev === 'jump') jump(); else if (ev === 'reload') reload(); else if (ev === 'swap') swap(); else if (ev === 'grenade') emp(); }
  }
  if (G.debugFire) fire = true; if (G.debugAds) ads = true;
  if (P.dead) { mx = my = 0; fire = false; }
  P.yaw += dyaw; P.pitch = clamp(P.pitch + dpitch, -1.45, 1.45);
  P.lookVel.x = damp(P.lookVel.x, dyaw / Math.max(dt, 1e-3) * 0.05, 10, dt); P.lookVel.y = damp(P.lookVel.y, dpitch / Math.max(dt, 1e-3) * 0.05, 10, dt);
  // 이동
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  sprint = sprint && my > 0.3 && !fire;
  P.sprint = sprint;
  const slow = W.def?.slow || 1;
  const sp = (sprint ? 7.4 : 4.9) * slow * (1 - 0.35 * W.adsAmt);
  fwd.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); rgt.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  const wantX = (fwd.x * my + rgt.x * mx) * sp, wantZ = (fwd.z * my + rgt.z * mx) * sp;
  const acc = P.onGround ? 14 : 3;
  P.vel.x = damp(P.vel.x, wantX, acc, dt); P.vel.z = damp(P.vel.z, wantZ, acc, dt);
  P.vel.y -= 16 * dt;
  P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt; P.pos.y += P.vel.y * dt;
  collideCircle(P.pos, 0.38, P.pos.y, 1.75, 0.5);
  const g = groundAt(P.pos.x, P.pos.z, P.pos.y + 0.05, 0.38, 0.5);
  if (P.pos.y <= g) { if (!P.onGround && P.vel.y < -6) { landT = 0.18; sfx('land', { vol: 0.4 }); } P.pos.y = g; P.vel.y = 0; P.onGround = true; }
  else if (P.pos.y > g + 0.06) P.onGround = false;
  if (P.onGround && g > P.pos.y - 0.6 && g < P.pos.y) P.pos.y = g;
  // 체력·EMP
  P.hurtDirT = Math.max(0, (P.hurtDirT || 0) - dt); P.empT = Math.max(0, P.empT - dt); P.regenT = Math.max(0, P.regenT - dt); P.hurtT = Math.max(0, P.hurtT - dt * 1.6);
  if (P.regenT <= 0 && !P.dead) P.hp = Math.min(P.maxHp, P.hp + 14 * dt);
  // 무기
  const speed = Math.hypot(P.vel.x, P.vel.z) / 5;
  // 발소리
  P.stepT = (P.stepT || 0) - dt * speed * (sprint ? 1.25 : 1);
  if (P.onGround && speed > 0.25 && P.stepT <= 0) { P.stepT = 0.42; sfx('land', { vol: 0.07 + 0.05 * speed, rate: 1.5 + Math.random() * 0.3, jitter: 0.1 }); }
  const scoped = updateWeapons(dt, { fire, ads, sprint, moving: speed > 0.25, airborne: !P.onGround, speed: P.onGround ? speed : 0, lookVel: P.lookVel });
  // 카메라: 시점 + 반동 + 걸음 흔들림 + 착지 + 흔들림 + 동작 카메라 뼈
  bobT += dt * (P.onGround ? speed * 9 : 0); landT = Math.max(0, landT - dt);
  const bob = Math.sin(bobT) * 0.035 * speed * (1 - W.adsAmt * 0.8);
  cam.position.set(P.pos.x, P.pos.y + 1.62 + bob - landT * 0.4, P.pos.z);
  G.shake = Math.max(0, G.shake - dt * 2.6);
  const sh = G.shake * G.shake * 0.03;
  qRec.set(P.pitch + (W.recoil.p * Math.PI / 180) + (Math.random() - 0.5) * sh, P.yaw + (W.recoil.y * Math.PI / 180) + (Math.random() - 0.5) * sh, Math.cos(bobT * 0.5) * 0.004 * speed, 'YXZ');
  cam.quaternion.setFromEuler(qRec).multiply(W.camDelta);
  const z = W.def?.scope && W.adsAmt > 0.5 ? W.def.scope : 1.28;
  const fov = 72 / lerp(1, z, W.adsAmt) + (sprint ? 6 : 0);
  if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = damp(cam.fov, fov, 16, dt); cam.updateProjectionMatrix(); }
  G.yaw = P.yaw;
  return { scoped, fire, ads };
}
