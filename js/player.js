// 플레이어: 이동(WASD·스틱)·달리기·점프·앉기·슬라이딩·충돌 + 시점(마우스 원시 입력·터치·자이로) + 체력·EMP
import * as THREE from 'three';
import { G, clamp, damp, lerp } from './state.js';
import { collideCircle, groundAt } from './world.js';
import { W, updateWeapons, reload, swap, selectSlot, inspect } from './weapons.js';
import { sfx } from './audio.js';
import { explosion, sparks, dust } from './fx.js';
import { stunAll, assistTargets } from './enemies.js';
import { S, sens } from './settings.js';

const SLIDE = 0.72;            // 슬라이딩 시간(초)
export const P = {
  pos: new THREE.Vector3(0, 1.05, 2.5), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: true,
  hp: 100, maxHp: 100, regenT: 0, empT: 0, empCd: 12, dead: false, hurtT: 0, lookVel: { x: 0, y: 0 },
  crouchT: false, crouchAmt: 0, slideT: 0, slideCd: 0, slideV: 0, slideDir: new THREE.Vector3(), roll: 0,
  bodyTop: 1.6, aimH: 1.4,      // 적이 노리는 높이·맞는 몸 높이 (앉으면 낮아져 낮은 벽 뒤에 숨을 수 있음)
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
let mouseFire = false, mouseAds = false, adsLatch = false, mdx = 0, mdy = 0, wheelT = 0, lastCur = 0;

// 마우스 잠금: 마우스는 원시 입력(OS 가속 없음), 터치패드는 OS 커서 속도 그대로
export function lockPointer() {
  const c = G.renderer?.domElement;
  if (!c || G.touch || document.pointerLockElement === c) return;
  const plain = () => { try { const q = c.requestPointerLock(); q?.catch?.(() => {}); } catch {} };
  if (S.device === 'pad') return plain();
  try {
    const p = c.requestPointerLock({ unadjustedMovement: true });
    p?.catch?.((e) => { if (e?.name === 'NotSupportedError') plain(); });
  } catch { plain(); }
}
export function initInput(canvas) {
  addEventListener('keydown', (e) => {
    if (e.target?.tagName === 'INPUT') return;
    if (G.state === 'play' && (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow'))) e.preventDefault();
    keys[e.code] = true;
    if (e.repeat || G.state !== 'play') return;
    switch (e.code) {
      case 'KeyR': reload(); break;
      case 'KeyQ': swap(); break;
      case 'Digit1': selectSlot(0); break;
      case 'Digit2': selectSlot(1); break;
      case 'KeyE': case 'KeyG': emp(); break;
      case 'Space': jump(); break;
      case 'KeyF': inspect(); break;
      case 'KeyC': crouchPress(); break;
    }
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseFire = mouseAds = false; });
  canvas.addEventListener('mousedown', (e) => {
    if (G.state !== 'play' || G.touch) return;
    if (!document.pointerLockElement) { lockPointer(); return; }
    if (e.button === 0) mouseFire = true;
    else if (e.button === 2) { mouseAds = true; if (!S.adsHold) adsLatch = !adsLatch; }
    else if (e.button === 1) { e.preventDefault(); emp(); }
    else if (e.button === 3) swap();          // 마우스 옆 버튼(뒤로) = 무기 교체
    else if (e.button === 4) emp();           // 옆 버튼(앞으로) = EMP
  });
  addEventListener('mouseup', (e) => { if (e.button === 0) mouseFire = false; if (e.button === 2) mouseAds = false; });
  // 옆 버튼이 브라우저 뒤로·앞으로 가기가 되지 않게
  for (const t of ['mousedown', 'mouseup', 'auxclick']) addEventListener(t, (e) => { if ((e.button === 3 || e.button === 4) && G.state !== 'title') e.preventDefault(); });
  addEventListener('mousemove', (e) => {
    if (!document.pointerLockElement || G.state !== 'play') return;
    mdx += clamp(e.movementX, -600, 600); mdy += clamp(e.movementY, -600, 600);    // 가끔 튀는 값 거르기
  });
  addEventListener('wheel', (e) => { if (G.state !== 'play' || Math.abs(e.deltaY) < 1 || G.time < wheelT) return; wheelT = G.time + 0.22; swap(); }, { passive: true });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.state === 'play' && !G.touch) G.pause?.(); });
}
export function jump() {
  if (!P.onGround || P.dead) return;
  P.slideT = 0; if (!S.crouchHold) P.crouchT = false;        // 슬라이딩 중 점프 = 속도 그대로 날기
  P.vel.y = 5.4; P.onGround = false; sfx('jump_a', { vol: 0.35, rate: 1.1 });
}
function crouchPress() {
  if (P.dead) return;
  const spd = Math.hypot(P.vel.x, P.vel.z);
  if (P.sprint && P.onGround && spd > 5.5 && P.slideCd <= 0) return startSlide(spd);
  if (!S.crouchHold) P.crouchT = !P.crouchT;
}
function startSlide(spd) {
  P.slideT = SLIDE; P.slideCd = SLIDE + 0.45; P.slideDir.set(P.vel.x / spd, 0, P.vel.z / spd); P.slideV = Math.max(spd + 3.2, 9.8);
  if (!S.crouchHold) P.crouchT = true;
  sfx('land', { vol: 0.5, rate: 0.55 }); sfx('weapon_change', { vol: 0.22, rate: 0.55 });
  dust(new THREE.Vector3(P.pos.x, P.pos.y + 0.05, P.pos.z), 12);
}
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
  P.crouchT = false; P.crouchAmt = 0; P.slideT = 0; P.slideCd = 0; P.roll = 0; adsLatch = false; mouseFire = mouseAds = false;
}

// 터치패드용 조준 보조: 적 근처에서 시점 감속 + 움직이거나 쏠 때 살짝 끌어당김 + 정조준 순간 스냅 + 몸에 닿으면 자동 사격
let autoT = 0, adsWas = false, snapT = 0;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function padAssist(dt, dyaw, dpitch, fire, ads, moving) {
  const cam = G.camera.position; const ts = assistTargets(cam);
  let best = null, near = null;
  for (const t of ts) {
    const dx = t.x - cam.x, dy = t.y - cam.y, dz = t.z - cam.z, h = Math.hypot(dx, dz), dist = Math.hypot(h, dy);
    const oy = wrap(Math.atan2(-dx, -dz) - P.yaw), op = Math.atan2(dy, h) - P.pitch, off = Math.hypot(oy, op);
    const ang = Math.atan(t.r / Math.max(dist, 0.1)), zone = Math.max(ang * 2.4, 0.035) * (ads ? 1.3 : 1);
    const c = { oy, op, off, ang, zone };
    if (!near || off < near.off) near = c;
    if (off < zone && (!best || off < best.off)) best = c;
  }
  if (ads && !adsWas) snapT = 0.16; adsWas = ads; snapT = Math.max(0, snapT - dt);
  if (snapT > 0 && near && near.off < 0.16) { const k = (1 - Math.exp(-16 * dt)) * 0.85; dyaw += near.oy * k; dpitch += near.op * k; }
  else if (best) {
    const slow = lerp(0.45, 1, best.off / best.zone); dyaw *= slow; dpitch *= slow;
    if (moving || fire || ads) { const k = (1 - Math.exp(-6 * dt)) * 0.45; dyaw += clamp(best.oy * k, -0.04, 0.04); dpitch += clamp(best.op * k, -0.04, 0.04); }
  }
  autoT = best && best.off < best.ang * 1.05 ? autoT + dt : 0;
  if (S.autoFire && autoT > 0.06) fire = true;
  return [dyaw, dpitch, fire];
}

const qRec = new THREE.Euler(0, 0, 0, 'YXZ'), fwd = new THREE.Vector3(), rgt = new THREE.Vector3();
let bobT = 0, landT = 0;
const tanH = (deg) => Math.tan(deg * Math.PI / 360);
export function updatePlayer(dt) {
  const cam = G.camera;
  // 조준 배율 → 시야각 (정조준 1.28배, 조준경 무기는 배율대로)
  const z = W.def?.scope && W.adsAmt > 0.5 ? W.def.scope : 1.28;
  const zoomFov = 2 * Math.atan(tanH(G.fov) / lerp(1, z, W.adsAmt)) * 180 / Math.PI;
  // 입력 모으기
  const view = { pos: cam.position, yaw: P.yaw, pitch: P.pitch, fov: cam.fov, baseFov: G.fov, adsAmt: W.adsAmt, moving: P.vel.lengthSq() > 1, sprinting: P.sprint };
  const c = G.controls && G.touch ? G.controls.update(dt, view) : null;
  if (W.cur !== lastCur) { adsLatch = false; lastCur = W.cur; }
  let mx = 0, my = 0, fire = mouseFire, ads = S.adsHold ? mouseAds : adsLatch, sprint = keys.ShiftLeft || keys.ShiftRight;
  if (keys.KeyW) my += 1; if (keys.KeyS) my -= 1; if (keys.KeyA) mx -= 1; if (keys.KeyD) mx += 1;
  // 마우스: 1px = 0.001rad × 감도, 정조준하면 시야각 비율만큼 느려짐 (조준경도 같은 손맛)
  const k = 0.001 * sens() * (tanH(zoomFov) / tanH(G.fov)) * lerp(1, S.adsSens, W.adsAmt);
  let dyaw = -mdx * k, dpitch = -mdy * k * (S.invertY ? -1 : 1); mdx = mdy = 0;
  if (c) {
    mx += c.move.x; my += c.move.y; dyaw += c.dyaw; dpitch += c.dpitch; fire = fire || c.fire; ads = ads || c.ads; sprint = sprint || c.sprint;
    for (const ev of c.events) { if (ev === 'jump') jump(); else if (ev === 'reload') reload(); else if (ev === 'swap') swap(); else if (ev === 'grenade') emp(); }
  }
  if (!G.touch && S.device === 'pad' && dt > 0 && !P.dead) [dyaw, dpitch, fire] = padAssist(dt, dyaw, dpitch, fire, ads, P.vel.lengthSq() > 1);
  if (G.debugFire) fire = true; if (G.debugAds) ads = true;
  if (P.dead) { mx = my = 0; fire = false; }
  P.yaw += dyaw; P.pitch = clamp(P.pitch + dpitch, -1.45, 1.45);
  const ldt = Math.max(dt, 1e-3);
  P.lookVel.x = damp(P.lookVel.x, clamp(dyaw / ldt * 0.05, -2.5, 2.5), 10, dt); P.lookVel.y = damp(P.lookVel.y, clamp(dpitch / ldt * 0.05, -2.5, 2.5), 10, dt);
  // 앉기 (전환식이면 달리기 키로 일어남) · 슬라이딩 중엔 계속 낮게
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  if (!S.crouchHold && P.crouchT && sprint && my > 0.3 && P.slideT <= 0) P.crouchT = false;
  let crouch = !P.dead && (S.crouchHold ? !!keys.KeyC : P.crouchT);
  if (P.slideT > 0) crouch = true;
  sprint = sprint && my > 0.3 && !fire && !crouch;
  if (sprint) adsLatch = false;
  P.sprint = sprint; P.crouch = crouch;
  // 이동
  const slow = W.def?.slow || 1;
  const sp = (sprint ? 7.4 : 4.9) * slow * (1 - 0.35 * W.adsAmt) * (crouch ? 0.5 : 1);
  fwd.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); rgt.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  const wx = fwd.x * my + rgt.x * mx, wz = fwd.z * my + rgt.z * mx;
  P.slideCd = Math.max(0, P.slideCd - dt);
  if (P.slideT > 0) {
    P.slideT = Math.max(0, P.slideT - dt);
    const u = 1 - P.slideT / SLIDE, v = lerp(P.slideV, 3.2, u * u);     // 처음엔 속도를 유지하다 끝에서 마찰로 느려짐 (약 6m)
    if (wx || wz) { P.slideDir.x += wx * dt * 1.4; P.slideDir.z += wz * dt * 1.4; const n = Math.hypot(P.slideDir.x, P.slideDir.z) || 1; P.slideDir.x /= n; P.slideDir.z /= n; }
    P.vel.x = P.slideDir.x * v; P.vel.z = P.slideDir.z * v;
    if (Math.random() < dt * 22) dust(new THREE.Vector3(P.pos.x, P.pos.y + 0.04, P.pos.z), 1);
  } else {
    const acc = P.onGround ? 14 : 3;
    P.vel.x = damp(P.vel.x, wx * sp, acc, dt); P.vel.z = damp(P.vel.z, wz * sp, acc, dt);
  }
  P.vel.y -= 16 * dt;
  P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt; P.pos.y += P.vel.y * dt;
  collideCircle(P.pos, 0.38, P.pos.y, 1.75, 0.5);
  const g = groundAt(P.pos.x, P.pos.z, P.pos.y + 0.05, 0.38, 0.5);
  if (P.pos.y <= g) { if (!P.onGround && P.vel.y < -6) { landT = 0.18; sfx('land', { vol: 0.4 }); } P.pos.y = g; P.vel.y = 0; P.onGround = true; }
  else if (P.pos.y > g + 0.06) P.onGround = false;
  if (P.onGround && g > P.pos.y - 0.6 && g < P.pos.y) P.pos.y = g;
  // 자세 높이: 눈·몸·적이 노리는 곳
  P.crouchAmt = damp(P.crouchAmt, P.slideT > 0 ? 1.15 : crouch ? 1 : 0, 13, dt);
  const ca = Math.min(1, P.crouchAmt);
  P.bodyTop = 1.6 - 0.55 * ca; P.aimH = 1.4 - 0.5 * ca;
  // 체력·EMP
  P.hurtDirT = Math.max(0, (P.hurtDirT || 0) - dt); P.empT = Math.max(0, P.empT - dt); P.regenT = Math.max(0, P.regenT - dt); P.hurtT = Math.max(0, P.hurtT - dt * 1.6);
  if (P.regenT <= 0 && !P.dead) P.hp = Math.min(P.maxHp, P.hp + 14 * dt);
  // 발소리 (앉으면 조용히, 슬라이딩 중엔 없음)
  const speed = Math.hypot(P.vel.x, P.vel.z) / 5;
  P.stepT = (P.stepT || 0) - dt * speed * (sprint ? 1.25 : crouch ? 0.7 : 1);
  if (P.onGround && P.slideT <= 0 && speed > 0.2 && P.stepT <= 0) { P.stepT = 0.42; sfx('land', { vol: (0.07 + 0.05 * speed) * (crouch ? 0.4 : 1), rate: 1.5 + Math.random() * 0.3, jitter: 0.1 }); }
  // 무기
  const scoped = updateWeapons(dt, { fire, ads, sprint, moving: speed > 0.25, airborne: !P.onGround, speed: P.onGround && P.slideT <= 0 ? speed : 0, lookVel: P.lookVel, crouch: crouch && P.slideT <= 0, slide: P.slideT > 0 });
  // 카메라: 시점 + 반동 + 걸음 흔들림 + 착지 + 흔들림 + 동작 카메라 뼈
  bobT += dt * (P.onGround && P.slideT <= 0 ? speed * 9 : 0); landT = Math.max(0, landT - dt);
  const bob = Math.sin(bobT) * 0.035 * speed * (1 - W.adsAmt * 0.8) * (crouch ? 0.6 : 1);
  cam.position.set(P.pos.x, P.pos.y + 1.62 - 0.54 * P.crouchAmt + bob - landT * 0.4, P.pos.z);
  G.shake = Math.max(0, G.shake - dt * 2.6);
  const sh = G.shake * G.shake * 0.03;
  P.roll = damp(P.roll, P.slideT > 0 ? 0.05 : 0, 9, dt);
  qRec.set(P.pitch + (W.recoil.p * Math.PI / 180) + (Math.random() - 0.5) * sh, P.yaw + (W.recoil.y * Math.PI / 180) + (Math.random() - 0.5) * sh, Math.cos(bobT * 0.5) * 0.004 * speed + P.roll, 'YXZ');
  cam.quaternion.setFromEuler(qRec).multiply(W.camDelta);
  const fov = zoomFov + (sprint ? 6 : 0) + (P.slideT > 0 ? 9 : 0);
  if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = damp(cam.fov, fov, 16, dt); cam.updateProjectionMatrix(); }
  G.yaw = P.yaw;
  return { scoped, fire, ads };
}
