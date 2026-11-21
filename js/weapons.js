// 무기: 표(성능) + 1인칭 손·무기 모델(애니메이션) + 사격(히트스캔)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { G, clamp, lerp, rand, damp } from './state.js';
import { gunshot, mech, sfx } from './audio.js';
import { applySkin, equipped, tickSkins } from './skins.js';

const PIS = { pos: [0.088, -0.092, -0.285], rot: [1.5, 4, -2] };
const SMG = { pos: [0.106, -0.12, -0.245], rot: [1.5, 4, -3] };
const RIF = { pos: [0.13, -0.14, -0.25], rot: [1.5, 4, -3] };
const BIG = { pos: [0.14, -0.15, -0.25], rot: [1.5, 4, -3] };
// dmg: 한 발(산탄은 알 하나) · rpm: 분당 · spread: 허리 사격 퍼짐(rad) · kick: 화면 반동(°) · scope: 정조준 배율(조준경 화면)
export const WEAPONS = {
  hx9: { short: 'HX-9', name: 'HX-9 Mk2', cls: '권총', tag: 'P', dmg: 28, rpm: 400, auto: false, mag: 15, spread: 0.012, kick: 1.3, hip: PIS, snd: 'pistol', shot: { size: 0.6, tone: 1.25 }, desc: '처음 받는 권총. 가볍고 정확하다.' },
  swarm: { short: '스웜', name: 'VX-M 스웜', cls: '기관권총', tag: 'P', dmg: 14, rpm: 950, auto: true, mag: 32, spread: 0.024, kick: 0.65, hip: PIS, snd: 'pistol', shot: { size: 0.55, tone: 1.35 }, desc: '연사되는 기관권총. 가까이서 쏟아붓는다.' },
  whisper: { short: '위스퍼', name: 'SL-6 위스퍼', cls: '권총', tag: 'P', dmg: 46, rpm: 300, auto: false, mag: 12, spread: 0.006, kick: 1.6, hip: PIS, snd: 'pistol', shot: { size: 0.6, tone: 0.9, supp: true }, desc: '소음 정밀 권총. 머리를 노리면 한두 방.' },
  wasp: { short: '와스프', name: 'MK-S 와스프', cls: '기관단총', tag: 'S', dmg: 16, rpm: 840, auto: true, mag: 30, spread: 0.018, kick: 0.6, hip: SMG, snd: 'rifle', shot: { size: 0.7, tone: 1.2 }, desc: '그립 탄창 기관단총. 빠르고 가볍다.' },
  mist: { short: '미스트', name: 'MK-V 미스트', cls: '기관단총', tag: 'S', dmg: 19, rpm: 720, auto: true, mag: 28, spread: 0.015, kick: 0.6, hip: SMG, snd: 'rifle', shot: { size: 0.7, tone: 1, supp: true }, desc: '소음 기관단총. 반동이 적다.' },
  hammer: { short: '해머', name: 'PS-12 해머', cls: '산탄총', tag: 'G', dmg: 14, pellets: 9, rpm: 75, auto: false, pump: true, mag: 6, spread: 0.075, kick: 4.5, hip: BIG, snd: 'pump', shot: { size: 1.5, tone: 0.8 }, desc: '펌프액션. 코앞의 로봇은 한 방에 날아간다.' },
  tempest: { short: '템페스트', name: 'AS-20 템페스트', cls: '산탄총', tag: 'G', dmg: 10, pellets: 7, rpm: 240, auto: true, mag: 20, spread: 0.085, kick: 2.2, hip: BIG, snd: 'rifle', shot: { size: 1.3, tone: 0.85 }, desc: '드럼 탄창 자동 산탄총.' },
  sentinel: { short: '센티넬', name: 'DM-7 센티넬', cls: '지정사수', tag: 'R', dmg: 62, rpm: 270, auto: false, mag: 15, spread: 0.02, adsSpread: 0.0015, kick: 2.2, scope: 2.3, hip: RIF, snd: 'rifle', shot: { size: 1.1, tone: 1 }, desc: '반자동 지정사수 소총. 중배율 조준경.' },
  nightfall: { short: '나이트폴', name: 'AR-S 나이트폴', cls: '소총', tag: 'R', dmg: 25, rpm: 660, auto: true, mag: 30, spread: 0.012, kick: 0.85, hip: RIF, snd: 'rifle', shot: { size: 0.9, tone: 1, supp: true }, desc: '소음 자동소총. 무난하고 정확하다.' },
  titan: { short: '타이탄', name: 'AR-H 타이탄', cls: '소총', tag: 'R', dmg: 34, rpm: 540, auto: true, mag: 25, spread: 0.014, kick: 1.15, hip: RIF, snd: 'rifle', shot: { size: 1.05, tone: 0.95 }, desc: '묵직한 자동소총. 한 발이 세다.' },
  falcon: { short: '팰컨', name: 'BL-1 팰컨', cls: '저격', tag: 'X', dmg: 150, rpm: 0, bolt: true, mag: 5, spread: 0.04, adsSpread: 0.0008, kick: 4, scope: 3.4, pierce: 1, hip: RIF, snd: 'bolt_falcon', shot: { size: 1.5, tone: 0.9 }, desc: '볼트액션 저격총. 쏠 때마다 노리쇠를 당긴다.' },
  rail: { short: '레일', name: 'HB-50 레일', cls: '저격', tag: 'X', dmg: 260, rpm: 0, bolt: true, mag: 5, spread: 0.045, adsSpread: 0.0006, kick: 6, scope: 4, pierce: 4, hip: BIG, snd: 'bolt_rail', shot: { size: 2, tone: 0.75 }, desc: '대구경 저격총. 줄 선 로봇을 꿰뚫는다.' },
  storm: { short: '스톰', name: 'LM-8 스톰', cls: '경기관총', tag: 'M', dmg: 22, rpm: 760, auto: true, mag: 100, spread: 0.02, kick: 0.75, slow: 0.9, hip: BIG, snd: 'rifle', shot: { size: 1, tone: 0.95 }, desc: '박스 탄창 경기관총. 탄이 100발.' },
  blitz: { short: '블리츠', name: 'HM-90 블리츠', cls: '중기관총', tag: 'M', dmg: 31, rpm: 600, auto: true, mag: 150, spread: 0.026, kick: 1.1, slow: 0.82, hip: BIG, snd: 'rifle', shot: { size: 1.35, tone: 0.8 }, desc: '대형 드럼 중기관총. 무겁지만 끝없이 쏜다.' },
};
export const CLS_COL = { P: '#7bd7ff', S: '#9dff8a', G: '#ffb35c', R: '#ff8ad8', X: '#ff5c5c', M: '#c39bff' };
// 애니메이션 박자에 붙는 기계음 (갤러리와 같은 표 · 볼트는 무기별 박자)
const SFXT = {
  pistol: { Draw: [[0.42, 'slide']], Reload: [[0.16, 'click'], [0.22, 'clunk'], [1.10, 'click'], [1.17, 'clunk']], ReloadEmpty: [[0.16, 'click'], [0.22, 'clunk'], [1.10, 'click'], [1.17, 'clunk'], [1.47, 'slide'], [1.63, 'clunk']] },
  rifle: { Draw: [[0.57, 'clunk'], [0.62, 'click']], Reload: [[0.22, 'click'], [0.26, 'clunk'], [1.30, 'clunk'], [1.36, 'click']], ReloadEmpty: [[0.22, 'click'], [0.26, 'clunk'], [1.30, 'clunk'], [1.36, 'click'], [1.62, 'slide']] },
  pump: { Fire: [[0.30, 'slide'], [0.43, 'clunk']], Draw: [[0.57, 'clunk']], Reload: [[0.84, 'shell'], [1.46, 'shell'], [2.08, 'shell']], ReloadEmpty: [[0.70, 'shell'], [0.86, 'clunk'], [1.39, 'shell'], [2.01, 'shell'], [2.63, 'shell']] },
  bolt_rail: { Fire: [[0.54, 'click'], [0.657, 'slide'], [0.68, 'click'], [0.92, 'clunk'], [1.06, 'slide'], [1.23, 'clunk'], [1.3, 'shell'], [1.34, 'click']], ReloadEmpty: [[0.22, 'click'], [0.26, 'clunk'], [1.3, 'clunk'], [1.8, 'click'], [1.917, 'slide'], [1.94, 'click'], [2.18, 'clunk'], [2.32, 'slide'], [2.49, 'clunk'], [2.6, 'click']], Reload: [[0.22, 'click'], [0.26, 'clunk'], [1.3, 'clunk'], [1.36, 'click']], Draw: [[0.57, 'clunk']] },
  bolt_falcon: { Fire: [[0.495, 'click'], [0.598, 'slide'], [0.613, 'click'], [0.818, 'clunk'], [0.94, 'slide'], [1.082, 'clunk'], [1.175, 'click'], [1.198, 'shell']], ReloadEmpty: [[0.22, 'click'], [0.26, 'clunk'], [1.3, 'clunk'], [1.755, 'click'], [1.858, 'slide'], [1.873, 'click'], [2.078, 'clunk'], [2.2, 'slide'], [2.341, 'clunk'], [2.435, 'click']], Reload: [[0.22, 'click'], [0.26, 'clunk'], [1.3, 'clunk'], [1.36, 'click']], Draw: [[0.57, 'clunk']] },
};

// ── 모델 불러오기 ───────────────────────────────────────
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const cache = {}, loading = {};
export function loadVM(id) {
  if (cache[id]) return Promise.resolve(cache[id]);
  if (loading[id]) return loading[id];
  loading[id] = loader.loadAsync(`assets/vm/${id}.glb`).then((g) => {
    const root = g.scene;
    root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; if (o.material) o.material.envMapIntensity = 0.9; } });
    const clips = {}; for (const c of g.animations) clips[c.name] = c;
    cache[id] = { root, clips };
    return cache[id];
  });
  return loading[id];
}

// ── 1인칭 장면 ─────────────────────────────────────────
const vmG = new THREE.Group();
const hipPos = new THREE.Vector3(), adsPos = new THREE.Vector3(), tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
export const W = {
  slots: ['hx9', null], cur: 0, ammo: {}, id: null, def: null,
  mixer: null, action: null, actName: '', camBone: null, camRest: new THREE.Quaternion(), flash: null,
  state: 'none',             // draw | idle | fire | reload | none
  nextShot: 0, fireT: 0, bloom: 0, adsAmt: 0, recoil: { p: 0, y: 0 }, camDelta: new THREE.Quaternion(),
  evQ: [], clipT: 0, pendingSwitch: null,
};
export function initVM() {
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0xeaf2fa, 0x30353c, 1.25));
  const k = new THREE.DirectionalLight(0xffffff, 2.0); k.position.set(0.6, 1, 0.4); s.add(k);
  const r = new THREE.DirectionalLight(0x9fd8ff, 0.7); r.position.set(-0.8, 0.3, -0.6); s.add(r);
  s.add(vmG);
  G.vmScene = s;
  G.vmCamera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.01, 10);
}
export function vmLight(env) { G.vmScene.environment = env; }
function setHip(def) {
  hipPos.fromArray(def.hip.pos);
  vmG.position.copy(hipPos); vmG.rotation.set(...def.hip.rot.map((d) => d * Math.PI / 180), 'YXZ');
  // 정조준: 화면 가운데 쪽으로 끌어오고 살짝 올림 (조준경 무기는 다 끌어오면 조준경 화면으로 바뀜)
  adsPos.set(def.tag === 'P' ? 0.0 : 0.012, hipPos.y + 0.045, hipPos.z + 0.035);
}
export async function equip(slot, fast = false) {
  const id = W.slots[slot]; if (!id) return;
  W.cur = slot; W.pendingSwitch = null;
  const def = WEAPONS[id];
  document.getElementById('vmload').classList.add('on');
  const m = await loadVM(id);
  document.getElementById('vmload').classList.remove('on');
  if (W.slots[W.cur] !== id) return;        // 불러오는 사이 다른 무기로 바뀜
  while (vmG.children.length) vmG.remove(vmG.children[0]);
  vmG.add(m.root); setHip(def); applySkin(m.root, equipped());
  W.id = id; W.def = def;
  if (W.ammo[id] === undefined) W.ammo[id] = def.mag;
  W.mixer = new THREE.AnimationMixer(m.root); W.clips = m.clips; W.action = null;
  W.camBone = m.root.getObjectByName('cam'); W.camRest.copy(W.camBone ? W.camBone.quaternion : tmpQ.identity()).invert();
  W.flash = m.root.getObjectByName('flash');
  play('Draw', { fade: 0, timeScale: fast ? 1.6 : 1.25 }); W.state = 'draw';
  W.nextShot = G.time + (fast ? 0.35 : 0.45);
  sfx('weapon_change', { vol: 0.45, rate: 1.05 });
}
function play(name, { fade = 0.12, loop = false, timeScale = 1 } = {}) {
  const clip = W.clips[name]; if (!clip) return null;
  const a = W.mixer.clipAction(clip);
  a.enabled = true; a.setEffectiveTimeScale(timeScale); a.setEffectiveWeight(1);
  a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = true;
  if (W.action && W.action !== a && fade > 0) { a.reset(); a.play(); a.crossFadeFrom(W.action, fade, false); }
  else { if (W.action && W.action !== a) W.action.stop(); a.reset(); a.play(); }
  W.action = a; W.actName = name; W.clipT = 0;
  const t = SFXT[W.def.snd]?.[name] || [];
  W.evQ = t.map((e) => [e[0] / timeScale, e[1]]).sort((x, y) => x[0] - y[0]);
  return a;
}
export function swap() {
  if (!W.slots[1 - W.cur] || W.state === 'none') return;
  equip(1 - W.cur, true);
}
export function canReload() { return W.def && W.ammo[W.id] < W.def.mag && W.state !== 'reload' && W.state !== 'draw' && W.state !== 'none'; }
export function reload() {
  if (!canReload()) return;
  const empty = W.ammo[W.id] === 0;
  play(empty && W.clips.ReloadEmpty ? 'ReloadEmpty' : 'Reload', { fade: 0.1 });
  W.state = 'reload'; W.reloadEnd = G.time + W.action.getClip().duration * (empty ? 0.86 : 0.84);
}

// ── 사격 ───────────────────────────────────────────────
const ray = new THREE.Ray(), dir = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
let hooks = { hitscan: null, tracer: null, muzzle: null };
export function setHooks(h) { hooks = { ...hooks, ...h }; }
export function muzzleWorld(out) {
  // 1인칭 장면의 총구(flash 뼈) → 화면 좌표계 → 세계 좌표
  if (!W.flash) return out.set(0.15, -0.12, -0.6).applyMatrix4(G.camera.matrixWorld);
  W.flash.getWorldPosition(out);
  out.applyQuaternion(tmpQ.copy(W.camDelta).invert());
  return out.applyMatrix4(G.camera.matrixWorld);
}
function shoot(moving, airborne) {
  const d = W.def, ads = W.adsAmt;
  W.ammo[W.id]--;
  const last = W.ammo[W.id] === 0;
  const clip = last && W.clips.FireLast ? 'FireLast' : 'Fire';
  play(clip, { fade: d.auto ? 0.02 : 0.03 });
  W.state = 'fire';
  // 다음 발: 볼트·펌프는 손이 다시 그립에 올 때까지
  if (last && W.clips.FireLast) { W.action.timeScale = 1.6; }
  if (d.bolt) W.nextShot = G.time + W.action.getClip().duration * 0.84;
  else if (d.pump) W.nextShot = G.time + W.action.getClip().duration * 0.8;
  else W.nextShot = G.time + 60 / d.rpm;
  gunshot(d.shot);
  // 퍼짐: 허리(이동·점프·연사 누적) / 정조준
  const hip = d.spread * (1 + (moving ? 0.6 : 0) + (airborne ? 1.2 : 0)) + W.bloom;
  const spr = lerp(hip, d.adsSpread ?? d.spread * 0.35, ads);
  W.bloom = Math.min(d.spread * 1.6, W.bloom + d.spread * 0.18);
  const cam = G.camera;
  cam.getWorldDirection(dir); right.set(1, 0, 0).applyQuaternion(cam.quaternion); up.set(0, 1, 0).applyQuaternion(cam.quaternion);
  const n = d.pellets || 1, mz = muzzleWorld(new THREE.Vector3());
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spr;
    const dv = dir.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
    ray.set(cam.position, dv);
    const hit = hooks.hitscan?.(ray, d.dmg, d.pierce || 0, i === 0 ? d : null);
    if (i < 3 || Math.random() < 0.35) hooks.tracer?.(mz, hit.point, d);
  }
  // 화면 반동 (위로 + 좌우 약간), 정조준이면 덜
  const k = d.kick * (1 - 0.35 * ads);
  W.recoil.p += k * rand(0.8, 1.1); W.recoil.y += k * rand(-0.35, 0.35);
  G.shake = Math.max(G.shake, Math.min(1, k * 0.06));
  hooks.muzzle?.(mz, d);
  if (navigator.vibrate && G.touch) G.controls?.haptic('fire');
}

// ── 매 프레임 ───────────────────────────────────────────
export function updateWeapons(dt, inp) {
  if (!W.mixer) return;
  const d = W.def;
  // 정조준 정도 (장전·꺼내기·달리기 중엔 해제)
  const wantAds = inp.ads && W.state !== 'reload' && W.state !== 'draw' && !inp.sprint;
  W.adsAmt = damp(W.adsAmt, wantAds ? 1 : 0, wantAds ? 14 : 18, dt);
  W.bloom = Math.max(0, W.bloom - dt * d.spread * (inp.fire ? 1.2 : 5));
  // 상태
  if (W.state === 'reload' && G.time >= W.reloadEnd) { W.ammo[W.id] = d.mag; W.state = 'reloadTail'; }
  const a = W.action;
  const done = a && a.loop === THREE.LoopOnce && a.time >= a.getClip().duration - 1e-3;
  if (done && W.ammo[W.id] === 0 && W.state === 'fire') { W.state = 'idle'; reload(); }          // 다 쏘면 동작이 끝나는 대로 자동 장전 (볼트·펌프 포함)
  else if (done && W.actName !== 'Idle') { play('Idle', { fade: 0.25, loop: true }); W.state = 'idle'; }
  W.still = (W.state === 'idle' && !inp.fire && !inp.ads && inp.speed < 0.1) ? (W.still || 0) + dt : 0;
  if (W.still > 7 && W.clips.Inspect && W.actName === 'Idle') { play('Inspect', { fade: 0.3 }); W.state = 'inspect'; W.still = 0; }
  if (W.state === 'inspect' && (inp.fire || inp.ads || inp.sprint)) { play('Idle', { fade: 0.15, loop: true }); W.state = 'idle'; }
  if (W.state === 'draw' && G.time >= W.nextShot) W.state = 'idle';
  // 사격
  const ready = (W.state === 'idle' || W.state === 'fire' || W.state === 'reloadTail' || W.state === 'inspect') && G.time >= W.nextShot && W.ammo[W.id] > 0;
  if (inp.fire && ready && !inp.sprint) shoot(inp.moving, inp.airborne);    // 반자동도 누르고 있으면 최대 연사로 (모바일 손맛)
  if (inp.fire && W.ammo[W.id] === 0 && W.state !== 'reload' && G.time >= W.nextShot && !W.triggerHeld) { reload(); }
  W.triggerHeld = inp.fire;
  // 소리 이벤트
  W.clipT += dt;
  while (W.evQ.length && W.evQ[0][0] <= W.clipT) mech(W.evQ.shift()[1]);
  W.mixer.update(dt); tickSkins(G.time);
  // 카메라 뼈(동작에 묻은 1~2° 끄덕임) → 두 카메라 모두
  if (W.camBone) W.camDelta.copy(W.camBone.quaternion).multiply(W.camRest); else W.camDelta.identity();
  // 반동 복귀
  W.recoil.p = damp(W.recoil.p, 0, 9, dt); W.recoil.y = damp(W.recoil.y, 0, 9, dt);
  // 정조준 자세
  const sc = d.scope && W.adsAmt > 0.92;
  vmG.visible = !sc;
  vmG.position.lerpVectors(hipPos, adsPos, W.adsAmt);
  // 걸음 흔들림·관성
  const bob = inp.speed * (1 - W.adsAmt * 0.8);
  vmG.position.x += Math.sin(G.time * 9) * 0.004 * bob + inp.lookVel.x * -0.006;
  vmG.position.y += -Math.abs(Math.cos(G.time * 9)) * 0.005 * bob + inp.lookVel.y * 0.004 - (inp.sprint ? 0.02 : 0);
  vmG.rotation.z = (d.hip.rot[2] * Math.PI / 180) + (inp.sprint ? 0.18 : 0) * (1 - W.adsAmt);
  return sc;
}
export function vmResize() { G.vmCamera.aspect = innerWidth / innerHeight; G.vmCamera.fov = innerWidth < innerHeight ? 66 : 54; G.vmCamera.updateProjectionMatrix(); }
export function vmRender() {
  G.vmCamera.quaternion.copy(W.camDelta);
  G.renderer.clearDepth(); G.renderer.render(G.vmScene, G.vmCamera);
}
export function resetWeapons() {
  W.slots = ['hx9', null]; W.cur = 0; W.ammo = {}; W.state = 'none'; W.adsAmt = 0; W.bloom = 0; W.recoil.p = W.recoil.y = 0;
}
