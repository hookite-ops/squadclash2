// SQUAD CLASH 2 — 1인칭 손·무기
// 무기고 19 로봇 팔 GLB 의 동작(꺼내기·대기·사격·장전·빈 탄창 장전·살펴보기)을 그대로 틀고, 걸음·달리기·관성은 game.js 가 넘겨준 값으로 얹는다.
// 정조준하면 모델의 실제 조준점(가늠쇠 야광점·도트 렌즈·조준경 렌즈)과 총열 방향을 화면 한가운데에 맞춘다.
import * as THREE from './vendor/three.module.js';
import { WEAPONS } from './shared.js';
import { loadModel, FIT, applySkin, skinFx, fadeMat, skinModelId, loadSkinModel, wearSkin, skinNodesOf } from './guns.js';
import { fitParts, loadParts, MOUNT, unfit, mountOf } from './attach.js';

const D2R = Math.PI / 180;
// 허리 자세 (무기고 19 갤러리와 같은 값: 총 뼈 위치·기울기)
const PIS = { pos: [0.088, -0.092, -0.285], rot: [1.5, 4, -2] }, SMG = { pos: [0.106, -0.12, -0.245], rot: [1.5, 4, -3] };
const RIF = { pos: [0.13, -0.14, -0.25], rot: [1.5, 4, -3] }, BIG = { pos: [0.14, -0.15, -0.25], rot: [1.5, 4, -3] };
const KNF = { pos: [0.1, -0.11, -0.3], rot: [8, 6, -6] };
const HIP = { hx9: PIS, swarm: PIS, whisper: PIS, punk: PIS, highnoon: PIS, wasp: SMG, mist: SMG, hammer: BIG, tempest: BIG, sentinel: RIF, nightfall: RIF, titan: RIF, hail: RIF, falcon: RIF, rail: BIG, storm: BIG, blitz: BIG, razor: KNF };
// 정조준 때 조준점이 오는 깊이 (화면 앞쪽 거리, m): 가늠쇠는 멀리, 도트·조준경은 가까이
const ADSZ = { trit: -0.42, pistol: -0.34, dot_lens: -0.2, lens_f: -0.28, none: -0.62, dot: -0.235, holo: -0.245, dot_p: -0.36, x3: -0.085 };
// 왼손 손가락이 가늠쇠보다 높이 올라오는 무기는 조준점을 손 위로 살짝 올림 (가늠쇠가 조준점 바로 아래에 보임)
const SIGHT_FIX = { titan: [0, 0.4242, 0.1265], hammer: [0, 0.5742, 0.1205] };
// 동작 박자에 붙는 기계음 (무기고 19 와 같은 표) — click·clunk·slide·shell
const SND = {
  pistol: { Draw: [[0.42, 'slide']], Reload: [[0.16, 'click'], [0.22, 'clunk'], [1.10, 'click'], [1.17, 'clunk']], ReloadEmpty: [[0.16, 'click'], [0.22, 'clunk'], [1.10, 'click'], [1.17, 'clunk'], [1.47, 'slide'], [1.63, 'clunk']] },
  rifle: { Draw: [[0.57, 'clunk'], [0.62, 'click']], Reload: [[0.22, 'click'], [0.26, 'clunk'], [1.30, 'clunk'], [1.36, 'click']], ReloadEmpty: [[0.22, 'click'], [0.26, 'clunk'], [1.30, 'clunk'], [1.36, 'click'], [1.62, 'slide']] },
  pump: { Fire: [[0.30, 'slide'], [0.43, 'clunk']], Draw: [[0.57, 'clunk']], Reload: [[0.84, 'shell'], [1.46, 'shell'], [2.08, 'shell']], ReloadEmpty: [[0.70, 'shell'], [0.86, 'clunk'], [1.39, 'shell'], [2.01, 'shell'], [2.63, 'shell']] },
  bolt_rail: { Fire: [[0.54, 'click'], [0.657, 'slide'], [0.68, 'click'], [0.92, 'clunk'], [1.06, 'slide'], [1.23, 'clunk'], [1.3, 'shell'], [1.34, 'click']], ReloadEmpty: [[0.22, 'click'], [0.26, 'clunk'], [1.3, 'clunk'], [1.8, 'click'], [1.917, 'slide'], [1.94, 'click'], [2.18, 'clunk'], [2.32, 'slide'], [2.49, 'clunk'], [2.6, 'click']], Reload: [[0.22, 'click'], [0.26, 'clunk'], [1.3, 'clunk'], [1.36, 'click']], Draw: [[0.57, 'clunk']] },
  brk: { Draw: [[0.46, 'click']], Reload: [[0.15, 'click'], [0.33, 'clunk'], [1.15, 'shell'], [1.19, 'shell'], [1.42, 'clunk'], [1.45, 'click']] },   // 꺾기: 레버·꺾임·두 발·닫힘
  rev: { Draw: [[0.46, 'click']], Fire: [[0.02, 'click']], Reload: [[0.10, 'click'], [0.30, 'slide'], [0.50, 'shell'], [0.53, 'shell'], [1.40, 'shell'], [1.66, 'clunk'], [1.69, 'click']] }, // 리볼버: 래치·실린더·이젝터·스피드로더·닫힘
  knife: { Draw: [[0.36, 'slide']], Inspect: [[2.6, 'slide']] },
  bolt_falcon: { Fire: [[0.495, 'click'], [0.598, 'slide'], [0.613, 'click'], [0.818, 'clunk'], [0.94, 'slide'], [1.082, 'clunk'], [1.175, 'click'], [1.198, 'shell']], ReloadEmpty: [[0.22, 'click'], [0.26, 'clunk'], [1.3, 'clunk'], [1.755, 'click'], [1.858, 'slide'], [1.873, 'click'], [2.078, 'clunk'], [2.2, 'slide'], [2.341, 'clunk'], [2.435, 'click']], Reload: [[0.22, 'click'], [0.26, 'clunk'], [1.3, 'clunk'], [1.36, 'click']], Draw: [[0.57, 'clunk']] },
};
const SNDOF = { hx9: 'pistol', swarm: 'pistol', whisper: 'pistol', punk: 'brk', highnoon: 'rev', hammer: 'pump', falcon: 'bolt_falcon', rail: 'bolt_rail', razor: 'knife' };
const ease = (v) => v * v * (3 - 2 * v);
const _X = new THREE.Vector3(1, 0, 0);

export function createFpv(vmScene, onSound = () => {}) {
  const wg = new THREE.Group(); vmScene.add(wg);
  const mixers = new Map();
  const S = { wi: -1, id: null, model: null, mixer: null, clips: {}, action: null, actName: '', evQ: [], clipT: 0, root: null, flash: null, cam: null, camRest: new THREE.Quaternion(),
    sight: new THREE.Vector3(), sdir: new THREE.Vector3(0, 1, 0), adsZ: -0.4, ret: null, retObj: null, emitter: null, hip: PIS, state: 'none', knife: false, swingT: -1, swingDir: 1, ready: false, req: 0,
    kick: [0, 0, 0, 0, 0, 0, 0, 0] }; // kick: 정조준 반동 용수철 [뒤로, 위로, 옆, 비틀림] 위치·속도
  const camDelta = new THREE.Quaternion(), muzzle = new THREE.Vector3(0.15, -0.1, -0.5), eject = new THREE.Vector3(0.1, -0.06, -0.35);
  // 도트 조준경의 붉은 점 (정조준하면 렌즈 가운데 = 화면 한가운데에 뜸)
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,60,50,1)'); gr.addColorStop(0.45, 'rgba(255,30,30,0.35)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  dot.scale.setScalar(0.0056); dot.renderOrder = 10; dot.visible = false; vmScene.add(dot);
  // 홀로그램 조준점: 둥근 고리 + 가운데 점 (정조준하면 창 가운데에 뜸)
  const holoTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.shadowColor = 'rgba(255,60,40,0.9)'; g.shadowBlur = 6; g.strokeStyle = 'rgba(255,90,70,1)'; g.lineWidth = 3.2; g.beginPath(); g.arc(64, 64, 44, 0, Math.PI * 2); g.stroke();
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { g.beginPath(); g.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); g.lineTo(64 + Math.cos(a) * 36, 64 + Math.sin(a) * 36); g.stroke(); }
    g.fillStyle = 'rgba(255,120,100,1)'; g.beginPath(); g.arc(64, 64, 3.4, 0, Math.PI * 2); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const holo = new THREE.Sprite(new THREE.SpriteMaterial({ map: holoTex, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  holo.scale.setScalar(0.021); holo.renderOrder = 10; holo.visible = false; vmScene.add(holo);
  const lensed = new WeakSet();
  function glassLens(scene) { // 렌즈 재질을 비치는 유리로 (처음 한 번)
    scene.traverse((o) => { if (!o.isMesh || !/lens/.test(o.name) || lensed.has(o)) return; lensed.add(o); const m = o.material.clone(); m.transparent = true; m.opacity = 0.16; m.depthWrite = false; m.metalness = 0.2; m.roughness = 0.05; if (m.emissive) m.emissiveIntensity = 0.15; o.material = m; o.renderOrder = 5; });
  }
  // 구조 스킨의 움직이는 장치: 집게 총구(쏘면 벌어짐) · 열기 덮개(연사하면 열리고 빛남) · 외눈(정조준하면 밝아짐) · 탄약 표시창
  const CLAW_A = { claw_u: 0, claw_l: 120, claw_r: -120 };
  function gimmicks(root) {
    const W = skinNodesOf(root), N = W && W.nodes; if (!N) return null;
    const G = { fire: 0, heat: 0, claws: [], vents: [], glows: [], eyes: [], ammo: -1, scr: null };
    const own = (o) => { o.traverse((m) => { if (m.isMesh && !m.userData.ownMat) { m.material = m.material.clone(); m.userData.ownMat = true; } }); return o; };
    for (const k in CLAW_A) for (const o of N[k] || []) { const a = CLAW_A[k] * D2R; G.claws.push({ o, q0: o.quaternion.clone(), ax: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)) }); }
    for (let i = 0; N['vent' + i]; i++) for (const o of N['vent' + i]) G.vents.push({ o, q0: o.quaternion.clone(), i });
    for (const o of N.heat || []) { own(o); o.traverse((m) => { if (m.isMesh) G.glows.push({ m: m.material, k: m.material.emissiveIntensity }); }); }
    for (const o of N.eye || []) { own(o); o.traverse((m) => { if (m.isMesh) G.eyes.push({ m: m.material, k: m.material.emissiveIntensity }); }); }
    const scr = (N.screen || []).find((o) => { let e = false; o.traverse((m) => { if (m.isMesh && m.material.emissive && m.material.emissive.getHex() !== 0) e = true; }); return e; });
    if (scr) { // 표시창 글자: 모델의 "30" 대신 남은 탄약을 그림
      scr.visible = false;
      const c = document.createElement('canvas'); c.width = 128; c.height = 96; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.029, 0.0218), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
      pl.position.copy(scr.position); pl.position.x -= 0.0001; pl.rotation.set(0, -Math.PI / 2, 0); pl.name = 'skin_ammo'; pl.renderOrder = 3; // 왼쪽 면(-x)을 봄
      root.add(pl); W.added.push(pl);
      G.scr = { c, g: c.getContext('2d'), tex };
    }
    return G;
  }
  function drawAmmo(G, n, mag) {
    const { g, c, tex } = G.scr; g.clearRect(0, 0, c.width, c.height);
    const low = mag > 0 && n <= Math.ceil(mag * 0.25);
    g.font = '700 64px ui-monospace, Menlo, Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = low ? 'rgba(255,40,30,0.9)' : 'rgba(255,140,40,0.9)'; g.shadowBlur = 10;
    g.fillStyle = low ? '#ff4a3a' : '#ffb04a'; g.fillText(String(Math.max(0, n)).padStart(2, '0'), 64, 44);
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,170,80,0.55)'; const w = mag > 0 ? Math.round(104 * Math.max(0, n) / mag) : 0; g.fillRect(12, 80, w, 6);
    tex.needsUpdate = true;
  }
  function setAmmo(n, mag) { const G = S.gk; if (!G || !G.scr || (G.ammo === n && G.mag === mag)) return; G.ammo = n; G.mag = mag; drawAmmo(G, n, mag); }
  const _gq = new THREE.Quaternion();
  function tickGimmicks(dt, ads) {
    const G = S.gk; if (!G) return;
    G.fire *= Math.exp(-dt * 13); G.heat = Math.max(0, G.heat - dt * 0.32);
    const open = 0.42 * Math.min(1, G.fire * 1.4);
    for (const c of G.claws) c.o.quaternion.copy(c.q0).multiply(_gq.setFromAxisAngle(c.ax, open));
    const h = G.heat * G.heat * (3 - 2 * G.heat);
    for (const v of G.vents) v.o.quaternion.copy(v.q0).multiply(_gq.setFromAxisAngle(_X, -(0.08 + 0.95 * Math.min(1, h * 1.15 + v.i * 0.02))));
    for (const g of G.glows) g.m.emissiveIntensity = g.k * (0.35 + 1.5 * h);
    for (const e of G.eyes) e.m.emissiveIntensity = e.k * ((1 - 0.65 * ads) + 0.08 * Math.sin(S.clipT * 7.3)); // 정조준하면 외눈 고리를 낮춰 빛 번짐이 가늠구멍을 가리지 않게
  }
  function play(name, { fade = 0.12, loop = false, ts = 1 } = {}) {
    const clip = S.clips[name]; if (!clip || !S.mixer) return null;
    const a = S.mixer.clipAction(clip);
    a.enabled = true; a.setEffectiveTimeScale(ts); a.setEffectiveWeight(1);
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = true;
    if (S.action && S.action !== a && fade > 0) { a.reset(); a.play(); a.crossFadeFrom(S.action, fade, false); }
    else { if (S.action && S.action !== a) S.action.stop(); a.reset(); a.play(); }
    S.action = a; S.actName = name; S.clipT = 0;
    const t = (SND[SNDOF[S.id] ?? 'rifle'] || {})[name] || [];
    S.evQ = t.map((e) => [e[0] / ts, e[1]]).sort((x, y) => x[0] - y[0]);
    return a;
  }
  // 무기 들기 (꺼내기 동작). si = 스킨 번호
  async function setWeapon(wi, si = 0, fast = true, parts = null, lv = 1) {
    const W = WEAPONS[wi]; if (!W) return;
    const req = ++S.req; S.wi = wi; S.ready = false;
    const id = W.vm2, knife = !!W.melee;
    let m; const skey = knife ? null : skinModelId(si, id);
    try { m = await loadModel(id); if (parts && parts.length) await loadParts().catch(() => {}); if (skey) await loadSkinModel(skey).catch(() => {}); } catch { return; }
    if (req !== S.req) return; // 받는 사이 다른 무기로 바뀜
    if (S.model && S.model !== m.scene) wg.remove(S.model);
    if (S.mixer) S.mixer.stopAllAction();
    S.model = m.scene; wg.add(m.scene); glassLens(m.scene);
    const hs = m.scene.getObjectByName('held_shell'); if (hs) hs.visible = id === 'hammer'; // 손에 쥔 산탄은 펌프 산탄총만 (소총 모델에 같이 들어 있음)
    S.root = m.scene.getObjectByName('root'); S.flash = m.scene.getObjectByName('flash'); S.cam = m.scene.getObjectByName('cam');
    if (S.root && wearSkin(S.root, skey)) unfit(S.root); // 구조 스킨 (모양이 바뀐 총): 파츠를 새 부품에 다시 맞춤
    const wn = skinNodesOf(S.root); S.gk = wn ? (wn.gk || (wn.gk = gimmicks(S.root))) : null; // 움직이는 장치는 모델마다 한 번만 만듦
    if (S.gk && S.gk.scr && S.gk.ammo < 0) drawAmmo(S.gk, WEAPONS[wi].mag || 0, WEAPONS[wi].mag || 0);
    const fx = skinFx(si), fi = !knife && S.root ? fitParts(S.root, id, wi, parts, { skin: si, lv, bundle: !!(fx && fx.bundle) }) : null; // 파츠 (내장 부품 숨기기·옮기기 포함)
    applySkin(m.scene, si);
    S.id = id; S.knife = knife; S.clips = m.clips;
    S.mixer = mixers.get(m.scene) || new THREE.AnimationMixer(m.scene); mixers.set(m.scene, S.mixer);
    S.action = null; S.actName = '';
    S.camRest.copy(S.cam ? S.cam.quaternion : new THREE.Quaternion()).invert();
    S.hip = HIP[id] || RIF;
    // 정조준: 조준경 파츠 → 그 조준점 / 가늠자 선이 있는 총 → 뒤 가늠자에서 가늠쇠로 / 그 밖 → 모델의 조준점
    const f = FIT[id] || {}, M = mountOf(S.root, id); // 구조 스킨은 가늠자 선이 다를 수 있음
    S.ret = null; S.retObj = null; S.sdir.set(0, 1, 0); S.optic = null; S.emitter = fi ? fi.emitter : null;
    if (fi && fi.ret) { S.sight.fromArray(fi.sight); S.retObj = fi.retObj; S.optic = fi.ret; S.ret = fi.ret === 'x3' ? null : fi.ret === 'holo' ? 'holo' : 'dot'; S.adsZ = ADSZ[fi.ret]; }
    else if (M && M.sight) { const r = M.sight.r, q = M.sight.f; S.sight.set(0, q[0], q[1]); S.sdir.set(0, q[0] - r[0], q[1] - r[1]).normalize(); S.adsZ = -(Math.hypot(q[0] - r[0], q[1] - r[1]) + M.sight.e); }
    else {
      if (SIGHT_FIX[id]) S.sight.fromArray(SIGHT_FIX[id]); else if (f.sight) S.sight.fromArray(f.sight); else if (f.muzzle) S.sight.set(f.muzzle[0], f.muzzle[1] - 0.01, f.muzzle[2] + 0.028); // 가늠쇠가 따로 없으면 총구 위
      S.ret = f.sk === 'dot_lens' ? 'dot' : null;
      S.adsZ = f.sk === 'dot_lens' ? ADSZ.dot_lens : f.sk === 'lens_f' ? ADSZ.lens_f : !f.sight ? ADSZ.none : W.vm === 'pistol' ? ADSZ.pistol : ADSZ.trit;
    }
    S.kick.fill(0);
    // 가늠자 선이 있는 총: 정조준하면 눈앞의 뒤 가늠자가 흐려져 가늠쇠가 또렷이 보임 (눈의 초점)
    S.rear = [];
    S.rearK = 0.78;
    if (M && M.sight && !(fi && fi.ret)) S.root.traverse((n) => { if (n.isMesh && n.userData.cat === 'ironr' && n.visible && n.userData.node !== 'eye') { if (n.userData.skin) S.rearK = 0.62; S.rear.push(fadeMat(n, si)); } }); // 구조 스킨의 머리 가늠자는 반쯤만 흐려짐 (외눈은 그대로)
    play('Draw', { fade: 0, ts: fast ? 1.55 : 1.25 }); S.state = 'draw'; S.swingT = -1;
    S.ready = true;
  }
  // 사격: 볼트·펌프는 연사 간격에 맞춰 동작 속도를 맞춘다
  function fire(last, eW) {
    const W = WEAPONS[S.wi]; if (!S.ready || !W) return;
    if (!W.melee) { // 정조준 반동: 뒤로 밀리고 총구가 들림 (허리 사격은 모델 동작이 맡음)
      const E = eW || W, kn = Math.min(3, Math.max(0.6, (E.kick || 0.006) / 0.006)), K = S.kick;
      K[4] += Math.min(0.75, 0.24 * kn); K[5] += Math.min(1.1, 0.34 * kn * (E.kv || 1)); K[6] += (Math.random() - 0.5) * 0.22 * kn * (E.kh || 1); K[7] += (Math.random() - 0.5) * 0.3 * kn;
    }
    if (W.melee) { // 칼: 베기 둘(오른 위→왼 아래 / 왼 아래→오른 위)을 번갈아. 휘두르는 간격에 동작 속도를 맞춤
      S.swingDir = -S.swingDir; const nm = S.swingDir > 0 || !S.clips.Shot ? 'Fire' : 'Shot', cl = S.clips[nm];
      if (!cl) { S.swingT = 0; return; }
      play(nm, { fade: 0.03, ts: Math.max(1, (cl.duration * 0.9) / Math.max(0.2, (W.interval || 450) / 1000)) }); S.state = 'fire'; return;
    }
    if (S.gk) { S.gk.fire = 1; S.gk.heat = Math.min(1, S.gk.heat + (W.auto ? 0.075 : 0.16)); }
    const name = last && S.clips.FireLast ? 'FireLast' : 'Fire', clip = S.clips[name]; if (!clip) return;
    let ts = 1;
    if (W.bolt) ts = Math.max(1, (clip.duration * 0.84) / (W.interval / 1000));
    else if (W.pump) ts = Math.max(0.75, (clip.duration * 0.8) / (W.interval / 1000));
    else if (last && name === 'FireLast') ts = 1.4;
    play(name, { fade: W.auto ? 0.02 : 0.03, ts }); S.state = 'fire';
  }
  // 장전: 탄창이 들어가 쏠 수 있게 되는 순간이 ms 에 오도록 동작 속도를 맞춘다
  function reload(empty, ms) {
    if (!S.ready || S.knife) return;
    const name = empty && S.clips.ReloadEmpty ? 'ReloadEmpty' : 'Reload', clip = S.clips[name]; if (!clip) return;
    const ts = THREE.MathUtils.clamp((clip.duration * (empty ? 0.86 : 0.84)) / Math.max(0.3, ms / 1000), 0.55, 1.8);
    play(name, { fade: 0.1, ts }); S.state = 'reload';
  }
  function inspect() { if (S.ready && S.clips.Inspect && (S.state === 'idle' || S.state === 'fire')) { play('Inspect', { fade: 0.25, ts: S.knife ? 1.1 : 1 }); S.state = 'inspect'; } }
  function stopInspect() { if (S.state === 'inspect') { play('Idle', { fade: 0.15, loop: true }); S.state = 'idle'; } }

  const _o = new THREE.Matrix4(), _h = new THREE.Matrix4(), _qo = new THREE.Quaternion(), _qh = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _v = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
  const _S = new THREE.Vector3(), _ax = new THREE.Vector3(), _up = new THREE.Vector3(), _rt = new THREE.Vector3(), _bk = new THREE.Vector3(), _m = new THREE.Matrix4(), _qc = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qi = new THREE.Quaternion();
  // 매 프레임. m = { pos:[x,y,z], rot:[x,y,z] } 화면 흔들림·달리기 자세(game.js), ads 0~1(부드럽게), fire 쏘는 중, spr 달리기 정도, visible
  function update(dt, m) {
    wg.visible = !!m.visible && !!S.model;
    if (!S.mixer) return;
    // 동작이 끝나면 대기 동작으로
    const a = S.action, done = a && a.loop === THREE.LoopOnce && a.time >= a.getClip().duration - 1e-3;
    if ((done || !a) && S.actName !== 'Idle') { play('Idle', { fade: 0.25, loop: true }); S.state = 'idle'; }
    if (S.state === 'inspect' && (m.fire || m.ads > 0.1 || m.spr > 0.5)) stopInspect();
    // 기계음
    S.clipT += dt;
    while (S.evQ.length && S.evQ[0][0] <= S.clipT) onSound(S.evQ.shift()[1]);
    S.mixer.update(dt);
    tickGimmicks(dt, m.ads || 0);
    if (S.cam) camDelta.copy(S.cam.quaternion).multiply(S.camRest); else camDelta.identity();
    // 자세 = 흔들림(바깥) × 허리 자세
    _e.set(m.rot[0], m.rot[1], m.rot[2], 'YXZ'); _qo.setFromEuler(_e); _o.compose(_v.fromArray(m.pos), _qo, _one);
    const h = S.hip; _e.set(h.rot[0] * D2R, h.rot[1] * D2R, h.rot[2] * D2R, 'YXZ'); _qh.setFromEuler(_e); _h.compose(_v.fromArray(h.pos), _qh, _one);
    // 칼 휘두르기: 오른쪽 위에서 왼쪽 아래로 크게 (번갈아 반대로)
    if (S.knife && S.swingT >= 0) {
      S.swingT += dt; const t = S.swingT / 0.34;
      if (t >= 1) S.swingT = -1;
      else {
        const k = t < 0.18 ? -ease(t / 0.18) * 0.35 : t < 0.55 ? -0.35 + ease((t - 0.18) / 0.37) * 1.35 : 1 - ease((t - 0.55) / 0.45), d = S.swingDir;
        _e.set(-0.55 * Math.sin(Math.PI * Math.min(1, t * 1.4)), -0.5 * k * d, 0.9 * k * d, 'YXZ'); _qc.setFromEuler(_e);
        _m.compose(_v.set(-0.07 * k * d, -0.03 * Math.sin(Math.PI * t), -0.06 * Math.sin(Math.PI * t)), _qc, _one); _h.premultiply(_m);
      }
    }
    _o.multiply(_h); _o.decompose(wg.position, wg.quaternion, _v);
    // 정조준: 조준점을 화면 한가운데로, 가늠자 선(조준경은 총열)을 화면 정면으로
    const ads = m.ads || 0, K = S.kick;
    for (let n = Math.max(1, Math.ceil(dt / 0.012)), h = dt / n, i = 0; i < n; i++) for (let c = 0; c < 4; c++) { const k = c ? 300 : 380, d = c ? 24 : 30; K[c + 4] += (-k * K[c] - d * K[c + 4]) * h; K[c] += K[c + 4] * h; } // 반동 용수철
    if (ads > 1e-3 && S.root && !S.knife) {
      wg.updateMatrixWorld(true);
      const R = S.root.matrixWorld.elements;
      _S.copy(S.sight).applyMatrix4(S.root.matrixWorld);
      _ax.copy(S.sdir).transformDirection(S.root.matrixWorld); _up.set(R[8], R[9], R[10]).normalize();
      _rt.crossVectors(_ax, _up).normalize(); _up.crossVectors(_rt, _ax).normalize();
      _m.makeBasis(_rt, _up, _bk.copy(_ax).negate()); _qc.setFromRotationMatrix(_m).invert();
      _qb.copy(_qi.identity()).slerp(_qc, ads);
      wg.position.sub(_S).applyQuaternion(_qb).add(_S); wg.quaternion.premultiply(_qb);
      wg.position.x -= _S.x * ads; wg.position.y -= _S.y * ads; wg.position.z += (S.adsZ - _S.z) * ads;
      // 반동·숨결·걸음 흔들림 (조준점을 중심으로 돌림)
      const t = m.t || 0, mv = Math.min(1, m.mv || 0), bob = m.bob || 0;
      _e.set((K[1] + Math.sin(t * 1.3) * 0.0011 + Math.abs(Math.sin(bob)) * 0.004 * mv) * ads, (K[2] + Math.sin(t * 0.9 + 1) * 0.0008 + Math.sin(bob) * 0.005 * mv) * ads, (K[3] + Math.sin(bob) * 0.012 * mv) * ads, 'YXZ'); _qc.setFromEuler(_e);
      _v.set(0, 0, S.adsZ); wg.position.sub(_v).applyQuaternion(_qc).add(_v); wg.quaternion.premultiply(_qc);
      wg.position.x += Math.sin(bob) * 0.0028 * mv * ads; wg.position.y -= Math.abs(Math.cos(bob)) * 0.0022 * mv * ads; wg.position.z += K[0] * ads;
    }
    if (S.rear && S.rear.length) { const o = 1 - S.rearK * ease(Math.min(1, Math.max(0, (ads - 0.45) / 0.5))); for (const mt of S.rear) { mt.opacity = o; mt.depthWrite = o > 0.98; } }
    wg.updateMatrixWorld(true);
    const showRet = !!S.ret && ads > 0.55 && wg.visible, rs = S.ret === 'holo' ? holo : dot;
    dot.visible = showRet && rs === dot; holo.visible = showRet && rs === holo;
    if (showRet && S.root) { if (S.retObj) S.retObj.getWorldPosition(rs.position); else rs.position.copy(S.sight).applyMatrix4(S.root.matrixWorld); rs.material.opacity = Math.min(1, (ads - 0.55) / 0.3); }
    if (S.flash) S.flash.getWorldPosition(muzzle);
    if (S.root) S.root.localToWorld(eject.set(0.03, 0.12, 0.06));
  }
  const state = () => S.state;
  return { setWeapon, fire, reload, inspect, stopInspect, update, setAmmo, camDelta, muzzle, eject, group: wg, state, get ready() { return S.ready; }, get wi() { return S.wi; }, get emitter() { return S.ready && wg.visible ? S.emitter : null; }, get optic() { return S.optic; } };
}
