// 화면 표시: HUD·토스트·처치 알림·적중 표시·무기 고르기 카드
import { G } from './state.js';
import { WEAPONS, CLS_COL, W } from './weapons.js';
const $ = (id) => document.getElementById(id);
export const el = new Proxy({}, { get: (_, k) => $(k) });
export function show(id, on) { $(id).classList.toggle('hidden', !on); }
let toastT = null;
export function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); }
export function feed(msg, head) { const d = document.createElement('div'); d.textContent = msg; if (head) d.className = 'head'; $('feed').prepend(d); setTimeout(() => d.remove(), 2700); while ($('feed').children.length > 5) $('feed').lastChild.remove(); }
export function hitMarker(kind) { const h = $('hitm'); h.className = ''; void h.offsetWidth; h.className = 'on' + (kind ? ' ' + kind : ''); }
let last = {};
export function hud(P, alive, queued) {
  const hp = Math.ceil(P.hp);
  if (last.hp !== hp) { $('hpBar').style.width = `${(P.hp / P.maxHp) * 100}%`; $('hpBar').classList.toggle('low', P.hp < 35); $('hpTxt').textContent = hp; last.hp = hp; }
  // 맞은 방향: 화면 가운데 둘레의 빨간 호
  const hd = $('hurtDir');
  if (P.hurtDirT > 0 && P.hurtFrom) { const a = Math.atan2(P.hurtFrom.x - P.pos.x, P.hurtFrom.z - P.pos.z); const rel = -(a - (P.yaw + Math.PI)); hd.style.opacity = Math.min(1, P.hurtDirT); hd.style.transform = `rotate(${rel}rad)`; } else if (hd.style.opacity !== '0') hd.style.opacity = 0;
  $('empBar').style.width = `${(1 - P.empT / P.empCd) * 100}%`;
  $('dmg').style.opacity = Math.min(1, P.hurtT * 0.9 + (P.hp < 30 ? 0.25 + 0.15 * Math.sin(G.time * 6) : 0));
  const left = alive + queued;
  if (last.left !== left || last.wave !== G.wave) { $('leftTxt').textContent = `남은 적 ${left}`; $('waveTxt').textContent = `웨이브 ${G.wave}`; last.left = left; last.wave = G.wave; }
  if (last.score !== G.score) { $('score').textContent = G.score.toLocaleString(); last.score = G.score; }
  const id = W.id; if (!id) return;
  const ammo = W.ammo[id], mag = WEAPONS[id].mag, key = `${id}|${ammo}|${W.state === 'reload'}|${W.slots.join(',')}|${W.cur}`;
  if (last.ammo !== key) {
    last.ammo = key;
    $('mag').textContent = W.state === 'reload' ? '…' : ammo; $('magMax').textContent = `/ ${mag}`; $('ammo').classList.toggle('low', ammo <= Math.ceil(mag * 0.25));
    $('wname').textContent = WEAPONS[id].name;
    $('slots').innerHTML = W.slots.map((s, i) => s ? `<div class="${i === W.cur ? 'on' : ''}">${i + 1} ${WEAPONS[s].short}</div>` : '').join('');
    if (G.controls) {
      G.controls.setBadge?.('fire', W.state === 'reload' ? '장전' : `${ammo}`);
      const other = W.slots[1 - W.cur]; G.controls.setBadge?.('crouch', other ? WEAPONS[other].short : '');
      G.controls.setDisabled?.('crouch', !other);
    }
  }
  if (G.controls) G.controls.setCooldown?.('grenade', P.empT / P.empCd);
  // 조준선 퍼짐
  const g = 7 + (W.def ? (W.def.spread * (1 - W.adsAmt) + W.bloom) * 340 : 0);
  $('cross').style.setProperty('--g', `${g.toFixed(1)}px`);
  $('cross').style.opacity = W.adsAmt > 0.6 && W.def?.scope ? 0 : 1 - W.adsAmt * 0.5;
}
export function resetHud() { last = {}; $('feed').innerHTML = ''; }
// 무기 고르기
export function cards(ids, onPick) {
  const box = $('cards'); box.innerHTML = '';
  const maxD = Math.max(...Object.values(WEAPONS).map((w) => w.dmg * (w.pellets || 1)));
  for (const id of ids) {
    const w = WEAPONS[id]; const dps = w.bolt ? 60 / 1.6 : w.pump ? 75 : w.rpm;
    const st = [['위력', Math.sqrt((w.dmg * (w.pellets || 1)) / maxD)], ['연사', Math.min(1, dps / 950)], ['탄창', Math.min(1, w.mag / 60)], ['정확도', Math.min(1, 0.006 / Math.max(0.006, w.adsSpread ?? w.spread * 0.35) * 0.9 + (w.scope ? 0.1 : 0))]];
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = `<span class="cls" style="background:${CLS_COL[w.tag]}22;color:${CLS_COL[w.tag]}">${w.cls}</span><div class="nm">${w.name}</div><div class="ds">${w.desc}</div>
      <div class="st">${st.map(([k, v]) => `<span>${k}</span><i><b style="width:${Math.round(Math.max(0.06, Math.min(1, v)) * 100)}%;background:${CLS_COL[w.tag]}"></b></i>`).join('')}</div>`;
    c.addEventListener('click', () => onPick(id));
    box.appendChild(c);
  }
}

// 큰 적(보행 전차) 머리 위 체력 막대
import * as THREE from 'three';
const _bp = new THREE.Vector3(); const barEls = [];
export function bars(enemies) {
  let k = 0;
  for (const e of enemies) {
    if (!e.alive || e.maxHp < 300 || !e.hitboxes.length) continue;
    _bp.copy(e.hitboxes[0].c); _bp.y += 1.6; _bp.project(G.camera);
    if (_bp.z > 1 || Math.abs(_bp.x) > 1.1 || Math.abs(_bp.y) > 1.1) continue;
    let el = barEls[k]; if (!el) { el = document.createElement('div'); el.innerHTML = '<b></b>'; $('bars').appendChild(el); barEls.push(el); }
    el.style.display = ''; el.style.transform = `translate(${(_bp.x * 0.5 + 0.5) * innerWidth}px, ${(-_bp.y * 0.5 + 0.5) * innerHeight}px)`;
    el.firstChild.style.width = `${Math.max(0, e.hp / e.maxHp) * 100}%`; k++;
  }
  for (let i = k; i < barEls.length; i++) barEls[i].style.display = 'none';
}

// 분대원 상태
let sqKey = '';
export function squadHud(sq) {
  const k = sq.map((m) => `${m.down ? 'd' : Math.ceil(m.hp / 10)}`).join('|'); if (k === sqKey) return; sqKey = k;
  $('sq').innerHTML = sq.map((m) => `<div class="${m.down ? 'down' : ''}"><span style="color:#${m.col.toString(16).padStart(6, '0')}">${m.name}</span><i><b style="width:${(m.hp / m.maxHp) * 100}%;background:#${m.col.toString(16).padStart(6, '0')}"></b></i>${m.down ? '다운' : ''}</div>`).join('');
}
