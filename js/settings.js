// 설정 — 노트북(키보드·마우스) 기준: 조작 기기(마우스/터치패드)·감도·정조준·앉기 방식·시야각·그래픽·소리·십자선
import { G, store } from './state.js';

const KEY = 'sc2_settings_v1';
const DEF = {
  device: 'mouse',          // mouse: 원시 입력(가속 없음) · pad: 터치패드(OS 가속 + 조준 보조)
  sensMouse: 1, sensPad: 2.5, adsSens: 0.85, invertY: false,
  adsHold: true, crouchHold: true, autoFire: true,
  fov: 103,                 // 16:9 기준 가로 시야각(°)
  quality: 'auto',          // auto | low | mid | high
  vol: 0.85, xColor: '#f4fbff',
};
export const S = (() => { try { return { ...DEF, ...JSON.parse(store.get(KEY) || '{}') }; } catch { return { ...DEF }; } })();
export const save = () => store.set(KEY, JSON.stringify(S));
// 세로 시야각(three.js 카메라용): 16:9 가로 시야각에서 환산 → 다른 비율 화면은 옆이 더 보임(Hor+)
export const vfov = () => 2 * Math.atan(Math.tan(S.fov * Math.PI / 360) * 9 / 16) * 180 / Math.PI;
export const sens = () => (S.device === 'pad' ? S.sensPad : S.sensMouse);
export const QNAME = { auto: '자동', low: '낮음', mid: '보통', high: '높음' };
const XC = ['#f4fbff', '#5dff8a', '#40e8ff', '#ffe14a', '#ff5ad7', '#ff4a4a'];

// 설정 화면 만들기 — onChange(key) 로 바뀐 항목을 알림
export function buildOptions(box, onChange, qualityNow) {
  box.innerHTML = '';
  const row = (label, ctrl, note) => {
    const r = document.createElement('div'); r.className = 'opt';
    const l = document.createElement('label'); l.textContent = label;
    if (note) { const s = document.createElement('small'); s.textContent = note; l.appendChild(s); }
    r.append(l, ctrl); box.appendChild(r); return { r, l };
  };
  const slider = (key, min, max, step, fmt) => {
    const w = document.createElement('div'); w.className = 'sl';
    const i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = S[key];
    const v = document.createElement('output'); v.textContent = fmt(S[key]);
    i.addEventListener('input', () => { S[key] = +i.value; v.textContent = fmt(S[key]); save(); onChange(key); });
    i.addEventListener('keydown', (e) => e.stopPropagation());
    w.append(i, v); return w;
  };
  const seg = (key, opts) => {
    const w = document.createElement('div'); w.className = 'seg';
    for (const [val, txt] of opts) {
      const b = document.createElement('button'); b.textContent = txt; b.dataset.v = String(val); if (S[key] === val) b.className = 'on';
      b.addEventListener('click', () => { S[key] = val; save(); [...w.children].forEach((c) => c.classList.toggle('on', c === b)); onChange(key); });
      w.appendChild(b);
    }
    return w;
  };
  if (!G.touch) {
    row('조작 기기', seg('device', [['mouse', '마우스'], ['pad', '터치패드']]), S.device === 'pad' ? '조준 보조가 켜지고 OS 커서 속도를 따라요' : '가속 없는 원시 입력');
    const sk = S.device === 'pad' ? 'sensPad' : 'sensMouse';
    row('감도', slider(sk, 0.1, 5, 0.05, (v) => v.toFixed(2)));
    row('정조준 감도', slider('adsSens', 0.3, 1.5, 0.05, (v) => `×${v.toFixed(2)}`), '조준경 배율은 따로 맞춰져요');
    row('Y축 반전', seg('invertY', [[false, '끄기'], [true, '켜기']]));
    row('정조준 (우클릭)', seg('adsHold', [[true, '누르고 있기'], [false, '눌러서 전환']]));
    row('앉기 (C)', seg('crouchHold', [[true, '누르고 있기'], [false, '눌러서 전환']]));
    if (S.device === 'pad') row('자동 사격', seg('autoFire', [[true, '켜기'], [false, '끄기']]), '조준선이 적 몸에 닿으면 쏴요');
  }
  row('시야각', slider('fov', 80, 120, 1, (v) => `${v}°`), '16:9 화면 가로 기준');
  const q = row('그래픽', seg('quality', [['auto', '자동'], ['low', '낮음'], ['mid', '보통'], ['high', '높음']]), '');
  const note = () => { q.l.querySelector('small')?.remove(); const s = document.createElement('small'); s.textContent = S.quality === 'auto' ? `지금 ${QNAME[qualityNow()]} · 끊기면 알아서 낮춰요` : '높음: 그림자·계단 현상 줄이기'; q.l.appendChild(s); };
  note();
  row('효과음', slider('vol', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`));
  const xc = document.createElement('div'); xc.className = 'xc';
  for (const c of XC) {
    const b = document.createElement('button'); b.style.background = c; b.setAttribute('aria-label', c); if (S.xColor === c) b.className = 'on';
    b.addEventListener('click', () => { S.xColor = c; save(); [...xc.children].forEach((x) => x.classList.toggle('on', x === b)); onChange('xColor'); });
    xc.appendChild(b);
  }
  row('십자선 색', xc);
  return { refreshQuality: note };
}
