// SQUAD CLASH 2 · 기계 침공 — 흐름: 불러오기 → 웨이브(출입구에서 적이 나옴) → 클리어 → 보급(무기 3개 중 하나) → 다음 웨이브
import * as THREE from 'three';
import { G, store, rand, pick } from './state.js';
import { initRenderer, buildArena, resize, renderWorld, updateGates, GATES, setQuality, quality } from './world.js';
import { initFx, updateFx, resizeFx, tracer, muzzle } from './fx.js';
import { P, initInput, updatePlayer, resetPlayer, lockPointer } from './player.js';
import { W, WEAPONS, initVM, vmLight, loadVM, equip, setHooks, vmRender, vmResize, resetWeapons } from './weapons.js';
import { loadEnemyModels, spawn, updateEnemies, hitscan, assistTargets, clearEnemies, alive, bindPlayer, bindSquad, enemies, dropOrb, updateOrbs } from './enemies.js';
import { squad, initSquad, updateSquad, resetSquad, reviveSquad } from './squad.js';
import { MobileFPSControls } from './controls/mfc.js';
import * as UI from './ui.js';
import { SKINS, TIER, owned, equipped, setEquipped, redeem, applySkin } from './skins.js';
import { initAudio, sfx, suspendAudio, setVolume } from './audio.js';
import { S, vfov, buildOptions, QNAME } from './settings.js';

const el = UI.el;
document.body.classList.toggle('pc', !G.touch);
// 설정 적용 (시야각·소리·십자선) — 화질은 렌더러를 만든 뒤
G.fov = vfov(); G.vol = S.vol;
document.documentElement.style.setProperty('--xc', S.xColor);
initRenderer(el.c);
buildArena();
const LEVELS = ['low', 'mid', 'high'];
let autoLv = G.touch ? 1 : 2;          // 자동: 노트북은 '높음'에서 시작해 끊기면 한 단계씩 낮춤
const applyQuality = () => setQuality(S.quality === 'auto' ? LEVELS[autoLv] : S.quality);
applyQuality();
initFx();
initVM(); vmLight(G.env);
bindPlayer(P);
initSquad(P); bindSquad(squad);
initInput(el.c);
G.best = parseInt(store.get('sc2_best') || store.get('a19_best') || '0', 10);
if (G.best) el.best.textContent = `최고 점수 ${G.best.toLocaleString()}`;
G.toast = UI.toast;
if (G.touch) {
  G.controls = new MobileFPSControls({ root: el.hud, hooks: { targets: () => assistTargets(G.camera.position) } });
  G.controls.setVisible(false);
}
Promise.all([loadEnemyModels(), loadVM('hx9')]).then(() => {
  el.btnStart.disabled = false; el.btnStart.textContent = '출격';
  // 다른 무기는 뒤에서 천천히 받아 둠 (보급 화면에서 바로 뜨게)
  const rest = Object.keys(WEAPONS).filter((k) => k !== 'hx9');
  setTimeout(async () => { for (const k of rest) { try { await loadVM(k); } catch {} } }, 15000);
}).catch((e) => { el.btnStart.textContent = '불러오기 실패 — 새로고침'; console.error(e); });

// ── 화면 전환 ──────────────────────────────────────────
function setState(s) {
  G.state = s;
  document.activeElement?.blur?.();           // 버튼에 남은 포커스가 Space·Enter 를 먹지 않게
  if (s !== 'play') { UI.stats(false); el.relock.classList.add('hidden'); }
  G.controls?.setVisible(s === 'play');
  UI.show('hud', s === 'play' || s === 'pause' || s === 'pick');
  UI.show('title', s === 'title'); UI.show('pause', s === 'pause'); UI.show('pick', s === 'pick'); UI.show('over', s === 'over');
  if (s !== 'play' && document.pointerLockElement) document.exitPointerLock?.();
}
async function startRun() {
  await initAudio();
  try { if (G.touch && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch {}
  try { await screen.orientation?.lock?.('landscape'); } catch {}
  clearEnemies(); resetPlayer(); resetWeapons(); resetSquad(); UI.resetHud();
  G.wave = 0; G.score = 0; G.kills = 0; G.heads = 0; G.runT = 0; G.streak = 0; G.breathing = false; G.shotsFired = 0; G.shotsHit = 0;
  await equip(0);
  setState('play');
  lockPointer();
  nextWave();
}
let starting = false;
async function start() {
  if (starting || el.btnStart.disabled) return; starting = true;
  lockPointer();                              // 클릭·키 입력 안에서 바로 잠가야 브라우저가 허락함
  try { await startRun(); } finally { starting = false; }
}
el.btnStart.addEventListener('click', start);
// ── 무기 스킨 화면 ─────────────────────────────────────
function swatch(k) {
  const h = (v) => `rgb(${(v || [1, 1, 1]).map((x) => Math.round(Math.min(1, x) * 255)).join(',')})`;
  if (!k.mode) return 'linear-gradient(135deg,#d8dde3,#8a96a3)';
  const g = k.g ? `, ${h(k.g)}` : '';
  return `linear-gradient(135deg, ${h(k.a)}, ${h(k.b || k.a)}${g})`;
}
function renderSkins() {
  const own = owned(), eq = equipped();
  el.skinGrid.innerHTML = SKINS.map((k) => { const t = TIER[k.tier]; return `<div class="sk${own.has(k.id) ? '' : ' lock'}${k.id === eq ? ' on' : ''}" data-id="${k.id}"><div class="sw" style="background:${swatch(k)}"></div><b>${k.name}</b><small style="color:${t[1].startsWith('linear') ? '#ffe07a' : t[1]}">${t[0]}</small></div>`; }).join('');
}
el.skinGrid.addEventListener('click', (e) => {
  const d = e.target.closest('.sk'); if (!d) return;
  if (!owned().has(d.dataset.id)) { el.codeMsg.textContent = '잠긴 스킨이에요. 코드를 등록하면 쓸 수 있어요.'; return; }
  setEquipped(d.dataset.id); renderSkins(); el.codeMsg.textContent = `${SKINS.find((k) => k.id === d.dataset.id).name} 장착`;
  if (W.mixer) applySkin(W.mixer.getRoot(), d.dataset.id);
});
el.btnCode.addEventListener('click', async () => {
  const ids = await redeem(el.codeIn.value);
  if (!ids) { el.codeMsg.textContent = '맞지 않는 코드예요.'; return; }
  el.codeIn.value = ''; renderSkins();
  el.codeMsg.textContent = `해금: ${ids.map((i) => SKINS.find((k) => k.id === i)?.name).filter(Boolean).join(', ')}`;
  sfx('coin', { vol: 0.6, rate: 1.2 });
});
el.codeIn.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') el.btnCode.click(); });
el.btnSkins.addEventListener('click', () => { renderSkins(); el.codeMsg.textContent = ''; UI.show('skins', true); UI.show('title', false); });
el.btnSkinClose.addEventListener('click', () => { UI.show('skins', false); UI.show('title', G.state === 'title'); });
el.btnAgain.addEventListener('click', start);
el.btnHome.addEventListener('click', () => { clearEnemies(); setState('title'); });
function resume() { setState('play'); suspendAudio(false); lockPointer(); }
el.btnResume.addEventListener('click', resume);
el.relock.addEventListener('click', () => lockPointer());
el.btnQuit.addEventListener('click', () => { clearEnemies(); suspendAudio(false); setState('title'); });
el.btnPause.addEventListener('click', () => G.pause());
el.btnPickQuit.addEventListener('click', () => { clearEnemies(); setState('title'); });
G.pause = () => {
  if (G.state !== 'play') return;
  setState('pause'); suspendAudio(true);
  if (G.controls && !el.settings.dataset.built) { G.controls.buildSettings(el.settings, { onEditLayout: () => { UI.show('pause', false); G.controls.setVisible(true); G.controls.openEditor(() => { G.controls.setVisible(false); UI.show('pause', true); }); } }); el.settings.dataset.built = 1; }
};
// ── 설정 화면 (제목·일시정지에서) ─────────────────────
let optUI = null;
function onOpt(key) {
  if (key === 'fov') { G.fov = vfov(); if (G.state === 'title') { G.camera.fov = G.fov; G.camera.updateProjectionMatrix(); } }
  else if (key === 'quality') { applyQuality(); optUI?.refreshQuality(); }
  else if (key === 'vol') setVolume(S.vol);
  else if (key === 'xColor') document.documentElement.style.setProperty('--xc', S.xColor);
  else if (key === 'device') openOpts(true);
}
let optFrom = 'title';
function openOpts(keep) {
  if (!keep) optFrom = G.state === 'pause' ? 'pause' : 'title';
  const sc = el.optList.scrollTop;
  optUI = buildOptions(el.optList, onOpt, quality);
  el.optList.scrollTop = sc;
  UI.show('opts', true); UI.show('title', false); UI.show('pause', false);
}
function closeOpts() { UI.show('opts', false); UI.show(optFrom, G.state === optFrom); document.activeElement?.blur?.(); }
el.btnOpts.addEventListener('click', () => openOpts());
el.btnPauseOpts.addEventListener('click', () => openOpts());
el.btnOptClose.addEventListener('click', closeOpts);
el.btnFull.addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch {}
});
document.addEventListener('fullscreenchange', () => { el.btnFull.textContent = document.fullscreenElement ? '창 모드' : '전체 화면'; });
// ── 메뉴 키보드 (노트북) ───────────────────────────────
const shown = (id) => !el[id].classList.contains('hidden');
addEventListener('keydown', (e) => {
  if (e.target?.tagName === 'INPUT' || e.repeat) return;
  const k = e.code;
  if (shown('opts')) { if (k === 'Escape') { e.preventDefault(); closeOpts(); } return; }
  if (shown('skins')) { if (k === 'Escape') { e.preventDefault(); el.btnSkinClose.click(); } return; }
  const st = G.state;
  if (st === 'play') {
    if (k === 'Escape' || k === 'KeyP') { e.preventDefault(); G.pause(); }
    else if (k === 'Tab') UI.stats(true);
  } else if (st === 'pause') { if (k === 'Enter' || k === 'KeyP') { e.preventDefault(); resume(); } }
  else if (st === 'title') { if (k === 'Enter') { e.preventDefault(); start(); } }
  else if (st === 'pick') {
    const i = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[k];
    if (i !== undefined) { e.preventDefault(); el.cards.children[i]?.click(); }
    else if (k === 'Space') { e.preventDefault(); el.btnSkip.click(); }
  } else if (st === 'over') { if (k === 'Enter' || k === 'Space') { e.preventDefault(); start(); } }
});
addEventListener('keyup', (e) => { if (e.code === 'Tab') UI.stats(false); });
// 판 도중 실수로 탭을 닫거나 새로고침하지 않게
addEventListener('beforeunload', (e) => { if (!G.touch && (G.state === 'play' || G.state === 'pause' || G.state === 'pick')) { e.preventDefault(); e.returnValue = ''; } });
function fitHud() {      // 노트북 화면 크기에 맞춰 HUD 글자·막대 크기
  const hz = Math.max(0.9, Math.min(1.75, Math.min(innerWidth / 1366, innerHeight / 768)));
  document.documentElement.style.setProperty('--hz', hz.toFixed(3));
}
addEventListener('resize', () => { resize(); vmResize(); resizeFx(); fitHud(); });
vmResize(); fitHud();
document.addEventListener('visibilitychange', () => { if (document.hidden) G.pause(); });

// ── 웨이브 ─────────────────────────────────────────────
let queue = [], spawnT = 0, clearT = -1;
function nextWave() {
  G.wave++;
  const n = G.wave;
  if (n > 1) reviveSquad();
  queue = [];
  const crawl = 3 + Math.floor(n * 1.6), drone = 1 + Math.floor(n * 1.1), walk = n >= 3 ? Math.floor((n - 1) / 2.5) : 0;
  for (let i = 0; i < crawl; i++) queue.push(['crawler', n >= 4 && Math.random() < Math.min(0.45, (n - 3) * 0.08)]);
  for (let i = 0; i < drone; i++) queue.push(['drone', n >= 5 && Math.random() < Math.min(0.4, (n - 4) * 0.08)]);
  for (let i = 0; i < walk; i++) queue.push(['walker', false]);
  if (n % 5 === 0) queue.push(['walker', true]);            // 5웨이브마다 보스
  queue.sort(() => Math.random() - 0.5);
  // 보행 전차는 웨이브 중간 이후에
  queue.sort((a, b) => (a[0] === 'walker') - (b[0] === 'walker'));
  spawnT = 1.6; clearT = -1; G.breathing = false;
  UI.toast(n === 1 ? '웨이브 1 · 기계 부대 접근' : n % 5 === 0 ? `웨이브 ${n} · 보스 웨이브` : `웨이브 ${n}${walk ? ' · 보행 전차 포함' : ''}`);
  if (n === 1) setTimeout(() => G.state === 'play' && UI.toast('빨간 눈이 약점 · 다 깨면 보급 무기'), 2600);
  sfx('toggle', { vol: 0.5, rate: 0.7 });
}
function updateWaves(dt) {
  if (G.breathing) return;
  const maxAlive = Math.min(14, 5 + G.wave);
  spawnT -= dt;
  if (queue.length && spawnT <= 0 && alive() < maxAlive) {
    const [kind, elite] = queue.shift();
    spawn(kind, (Math.random() * GATES.length) | 0, elite);
    spawnT = kind === 'walker' ? 3 : rand(0.5, 1.2) * Math.max(0.5, 1 - G.wave * 0.04);
  }
  if (!queue.length && alive() === 0 && clearT < 0) {
    clearT = 1.4; G.score += 250 * G.wave; UI.toast(`웨이브 ${G.wave} 클리어! +${250 * G.wave}`); sfx('coin', { vol: 0.7, rate: 0.9 });
  }
  if (clearT > 0) { clearT -= dt; if (clearT <= 0) openPick(); }
}
function openPick() {
  P.hp = P.maxHp; P.empT = 0;
  const held = new Set(W.slots.filter(Boolean));
  // 웨이브가 오를수록 강한 무기가 잘 나옴
  const tier = { P: 0, S: 1, G: 1, R: 2, X: 3, M: 3 };
  const pool = Object.keys(WEAPONS).filter((k) => !held.has(k));
  const ids = [];
  while (ids.length < 3 && pool.length) {
    const wts = pool.map((k) => Math.max(0.15, 1 + (G.wave - 1) * 0.35 * tier[WEAPONS[k].tag] - tier[WEAPONS[k].tag] * 0.9));
    let r = Math.random() * wts.reduce((a, b) => a + b, 0), i = 0;
    while (r > wts[i]) r -= wts[i++];
    ids.push(pool.splice(i, 1)[0]);
  }
  for (const id of ids) loadVM(id).catch(() => {});        // 카드에 뜬 무기는 바로 받기 시작
  el.pickTitle.textContent = `웨이브 ${G.wave} 클리어 · 보급 도착`;
  el.pickSub.textContent = W.slots[1] ? `고른 무기가 지금 든 ${WEAPONS[W.id].name}와 바뀌어요. 체력은 다 찼어요.` : '고른 무기가 두 번째 칸에 들어가요. 체력은 다 찼어요.';
  UI.cards(ids, async (id) => {
    const slot = W.slots[1] ? W.cur : 1;
    W.slots[slot] = id; W.ammo[id] = WEAPONS[id].mag;
    setState('play'); lockPointer();
    await equip(slot);
    breather();
  });
  setState('pick');
}
el.btnSkip.addEventListener('click', () => { setState('play'); lockPointer(); for (const k in W.ammo) W.ammo[k] = WEAPONS[k].mag; breather(); });
function breather() {      // 다음 웨이브 전 3초: 자리 잡기
  queue = []; G.breathing = true; let n = 3;
  const tick = () => { if (G.state !== 'play' && G.state !== 'pause') return; if (G.state === 'pause') return setTimeout(tick, 300); if (n > 0) { UI.toast(`다음 웨이브 ${n}`); n--; setTimeout(tick, 1000); } else nextWave(); };
  tick();
}
G.onDeath = () => {
  setTimeout(() => {
    const best = Math.max(G.best, G.score); const nb = best > G.best; G.best = best; store.set('sc2_best', String(best));
    el.overStats.innerHTML = `점수 <b>${G.score.toLocaleString()}</b>${nb ? ' · 최고 기록!' : ''}<br>웨이브 <b>${G.wave}</b> · 처치 <b>${G.kills}</b> · 머리 <b>${G.heads}</b>`;
    el.best.textContent = `최고 점수 ${G.best.toLocaleString()}`;
    setState('over');
  }, 900);
  UI.toast('격납고 함락…');
};

// ── 분대원 처치 ────────────────────────────────────────
const ENAME = (e) => e.constructor.name === 'Drone' ? '정찰 드론' : e.constructor.name === 'Walker' ? (e.boss ? '철갑 거상' : '보행 전차') : '크롤러';
G.onSquadKill = (m, e, head) => { const pts = Math.round(e.points * 0.5); G.score += pts; UI.feed(`${m.name} → ${ENAME(e)} 처치 +${pts}`); };
// ── 사격 연결 ──────────────────────────────────────────
setHooks({
  hitscan: (ray, dmg, pierce, def) => hitscan(ray, dmg, pierce, (e, head, killed, at) => {
    UI.hitMarker(killed ? 'kill' : head ? 'head' : '');
    if (head) sfx('impact', { vol: 0.35, rate: 2.2 });
    G.controls?.haptic(killed ? 'kill' : 'hit');
    if (killed) {
      G.kills++; if (head) G.heads++;
      // 연속 처치 (3초 안)
      G.streak = G.time - (G.lastKill || -9) < 3 ? (G.streak || 1) + 1 : 1; G.lastKill = G.time;
      const mult = 1 + Math.min(4, G.streak - 1) * 0.25;
      const pts = Math.round(e.points * (head ? 1.5 : 1) * mult);
      G.score += pts;
      if (G.streak >= 2) UI.toast(['', '', '더블 킬', '트리플 킬', '쿼드라 킬', '기계 학살'][Math.min(5, G.streak)] + (G.streak > 5 ? ` ×${G.streak}` : ''));
      if (Math.random() < (P.hp < 50 ? 0.22 : 0.1)) dropOrb(at);
      const nm = ENAME(e);
      UI.feed(`${head ? '◎ ' : ''}${nm} 처치 +${pts}`, head);
    }
  }),
  tracer: (a, b, def) => tracer(a, b, def),
  muzzle: (p) => muzzle(p),
});

// ── 루프 ───────────────────────────────────────────────
const clock = new THREE.Clock();
let fpsAcc = 0, fpsN = 0, settleT = 1.5, unlockT = 0;
function frame() {
  requestAnimationFrame(frame);
  const raw = clock.getDelta(), dt = Math.min(raw, 0.05);
  // 마우스 잠금이 풀린 채(잠금 실패·대기)면 멈추고 '클릭해서 계속'
  unlockT = !G.touch && G.state === 'play' && !document.pointerLockElement ? unlockT + raw : 0;
  const frozen = unlockT > 0.25; el.relock.classList.toggle('hidden', !frozen);
  // 화질 자동: 4초 평균이 기준(노트북 50, 폰 40fps) 아래면 한 단계 낮춤
  if (G.state === 'play' && !frozen && S.quality === 'auto' && autoLv > 0) {
    if (settleT > 0) settleT -= raw;
    else { fpsAcc += raw; fpsN++; if (fpsAcc > 4) { if (fpsN / fpsAcc < (G.touch ? 40 : 50)) { autoLv--; applyQuality(); optUI?.refreshQuality(); settleT = 2; } fpsAcc = 0; fpsN = 0; } }
  }
  G.dt = dt;
  const live = G.state === 'play' && !frozen;
  if (G.state === 'play' || G.state === 'pick') {
    if (live || G.state === 'pick') G.time += dt;
    if (live) { G.runT += dt; updateWaves(dt); }
    const r = updatePlayer(live ? dt : 0);
    el.hud.classList.toggle('scoped', !!r.scoped);
    if (live) { updateEnemies(dt); updateOrbs(dt); updateSquad(dt); }
    updateGates(dt);
    UI.hud(P, alive(), queue.length); UI.bars(enemies); UI.squadHud(squad);
  } else if (G.state === 'title') {
    G.time += dt;
    // 제목 화면: 격납고를 천천히 둘러봄
    const a = G.time * 0.12; G.camera.position.set(Math.sin(a) * 12, 4.2, Math.cos(a) * 12); G.camera.lookAt(0, 1.5, 0);
    if (Math.abs(G.camera.fov - G.fov) > 0.01) { G.camera.fov = G.fov; G.camera.updateProjectionMatrix(); }
    updateGates(dt);
  }
  updateFx(dt);
  renderWorld();
  if ((G.state === 'play' || G.state === 'pause' || G.state === 'pick' || G.state === 'over') && W.mixer) vmRender();
}
setState('title');
requestAnimationFrame(frame);
// 디버그: 콘솔에서 상태 보기
window.__a19 = { G, P, W, S, enemies, spawn, equip, openPick, nextWave, quality, setQuality };
