// SQUAD CLASH 2 · 기계 침공 — 흐름: 불러오기 → 웨이브(출입구에서 적이 나옴) → 클리어 → 보급(무기 3개 중 하나) → 다음 웨이브
import * as THREE from 'three';
import { G, store, rand, pick } from './state.js';
import { initRenderer, buildArena, resize, renderWorld, updateGates, GATES, setLowQuality } from './world.js';
import { initFx, updateFx, resizeFx, tracer, muzzle } from './fx.js';
import { P, initInput, updatePlayer, resetPlayer } from './player.js';
import { W, WEAPONS, initVM, vmLight, loadVM, equip, setHooks, vmRender, vmResize, resetWeapons } from './weapons.js';
import { loadEnemyModels, spawn, updateEnemies, hitscan, assistTargets, clearEnemies, alive, bindPlayer, bindSquad, enemies, dropOrb, updateOrbs } from './enemies.js';
import { squad, initSquad, updateSquad, resetSquad, reviveSquad } from './squad.js';
import { MobileFPSControls } from './controls/mfc.js';
import * as UI from './ui.js';
import { SKINS, TIER, owned, equipped, setEquipped, redeem, applySkin } from './skins.js';
import { initAudio, sfx, suspendAudio } from './audio.js';

const el = UI.el;
document.body.classList.toggle('pc', !G.touch);
initRenderer(el.c);
buildArena();
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
  G.wave = 0; G.score = 0; G.kills = 0; G.heads = 0; G.runT = 0; G.streak = 0; G.breathing = false;
  await equip(0);
  setState('play');
  if (!G.touch) el.c.requestPointerLock?.();
  nextWave();
}
el.btnStart.addEventListener('click', startRun);
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
el.btnAgain.addEventListener('click', startRun);
el.btnHome.addEventListener('click', () => { clearEnemies(); setState('title'); });
el.btnResume.addEventListener('click', () => { setState('play'); suspendAudio(false); if (!G.touch) el.c.requestPointerLock?.(); });
el.btnQuit.addEventListener('click', () => { clearEnemies(); suspendAudio(false); setState('title'); });
el.btnPause.addEventListener('click', () => G.pause());
el.btnPickQuit.addEventListener('click', () => { clearEnemies(); setState('title'); });
G.pause = () => {
  if (G.state !== 'play') return;
  setState('pause'); suspendAudio(true);
  if (G.controls && !el.settings.dataset.built) { G.controls.buildSettings(el.settings, { onEditLayout: () => { UI.show('pause', false); G.controls.setVisible(true); G.controls.openEditor(() => { G.controls.setVisible(false); UI.show('pause', true); }); } }); el.settings.dataset.built = 1; }
};
addEventListener('resize', () => { resize(); vmResize(); resizeFx(); });
vmResize();
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
    setState('play'); if (!G.touch) el.c.requestPointerLock?.();
    await equip(slot);
    breather();
  });
  setState('pick');
}
el.btnSkip.addEventListener('click', () => { setState('play'); if (!G.touch) el.c.requestPointerLock?.(); for (const k in W.ammo) W.ammo[k] = WEAPONS[k].mag; breather(); });
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
let fpsAcc = 0, fpsN = 0, lowQ = false;
function frame() {
  requestAnimationFrame(frame);
  const raw = clock.getDelta(), dt = Math.min(raw, 0.05);
  // 프레임이 계속 40 아래면 화질을 낮춤 (한 번만)
  if (G.state === 'play' && !lowQ) { fpsAcc += raw; fpsN++; if (fpsAcc > 3) { if (fpsN / fpsAcc < 40) { lowQ = true; setLowQuality(true); } fpsAcc = 0; fpsN = 0; } }
  G.dt = dt;
  if (G.state === 'play' || G.state === 'pick') {
    G.time += dt;
    if (G.state === 'play') { G.runT += dt; updateWaves(dt); }
    const r = updatePlayer(G.state === 'play' ? dt : 0);
    el.hud.classList.toggle('scoped', !!r.scoped);
    if (G.state === 'play') { updateEnemies(dt); updateOrbs(dt); updateSquad(dt); }
    updateGates(dt);
    UI.hud(P, alive(), queue.length); UI.bars(enemies); UI.squadHud(squad);
  } else if (G.state === 'title') {
    G.time += dt;
    // 제목 화면: 격납고를 천천히 둘러봄
    const a = G.time * 0.12; G.camera.position.set(Math.sin(a) * 12, 4.2, Math.cos(a) * 12); G.camera.lookAt(0, 1.5, 0);
    updateGates(dt);
  }
  updateFx(dt);
  renderWorld();
  if ((G.state === 'play' || G.state === 'pause' || G.state === 'pick' || G.state === 'over') && W.mixer) vmRender();
}
setState('title');
requestAnimationFrame(frame);
// 디버그: 콘솔에서 상태 보기
window.__a19 = { G, P, W, enemies, spawn, equip, openPick, nextWave };
