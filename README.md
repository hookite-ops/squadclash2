# SQUAD CLASH 2 (스쿼드 클래시 2)

[SQUAD CLASH](https://github.com/hookite-ops/SquadClash) 의 후속작 — 노트북 브라우저에서 바로 하는 멀티플레이 FPS.
폭탄전 · 팀 데스매치 · 생존전(배틀로얄), 방 목록·빠른 참가·방 코드, 봇, 상점, 무기고(스킨·파츠·스킨 코드)는 전작 그대로이고,

- **캐릭터:** Blender 로 설계한 휴머노이드 로봇(RX-7) — 흰 장갑에 그린 그림·요원 스킨·봇 도색이 입혀지고, 빛나는 줄이 팀 색
- **무기:** 오리지널 무기고 19 전부 — 직접 설계한 무기와 로봇 팔, 실제 손·동작(꺼내기·사격·장전·빈 탄창 장전·볼트·펌프·꺾기·리볼버 실린더·칼 베기·살펴보기)
- **정조준:** 뒤 가늠자 → 가늠쇠 선을 화면 정면에 맞추고, 정조준하면 눈앞의 뒤 가늠자가 흐려짐(초점). 정조준 반동·숨결·걸음 흔들림, 궤적은 실제 총구에서
  - 조준경 화면: 저격총(밀 도트), 센티넬(지정사수), 3배율(붉은 V) — Shift 로 숨 참기
- **파츠:** 무기 15가지 부착물을 Blender 로 만들어 1인칭·3인칭·무기고에 실제로 붙임 (소음기·보정기·제동기·장/경량 총열·레드 도트·홀로그램·3배율·개머리판 2·손잡이 2·대용량/빠른 탄창·레이저)
  - 내장 총구 장치·가늠자·조준경·개머리판·손잡이는 파츠를 달면 숨기거나 옮김 (장총열 → 총구 장치가 앞으로)
  - 조준경 파츠는 정조준 조준점·배율이 바뀜, 레이저는 빛줄기와 붉은 점, 스킨 Lv.3 파츠 스킨 · Lv.5 도는 고리
- **맵:** 전작 6개 맵을 더 높은 화질로 — 구석 그늘(SSAO), 물리 기반 재질, 모서리 깎기, 건물 처마 띠, 새 나무·풀, 소품
- 전작 스킨 코드가 그대로 통함

## 구성
- `server.js` — 게임 서버 (방, 라운드, 돈, 생존전, 봇, 피격 판정) · Node.js + ws
- `public/` — 화면 (Three.js r186)
  - `fpv.js` 1인칭 손·무기·정조준 · `guns.js` 무기 모델·스킨 · `attach.js` 파츠 붙이기 · `shared.js` 무기 성능(서버와 같이 씀) · `maps.js`/`world.js` 맵 · `post.js` 화면 효과(그늘·빛 번짐·색)
  - `robot.js` 로봇 몸(뼈 12개) · `avatar.js` 동작 · `paint.js` 그림 · `operators.js` 요원 스킨
  - `assets/vm/*.glb` 무기고 19 모델(내장 부품은 역할별로 나뉨), `assets/parts.glb` 파츠, `assets/robot*.glb` 로봇 몸 (meshopt 압축)
- 내 컴퓨터에서: `npm install && npm start` → http://localhost:8080

## Cloud Run 설정 (한 번)
방이 모두 서버 한 대에서 돌아야 같은 방 코드로 만날 수 있어요:
```
gcloud run services update squadclash2 --region asia-northeast3 --max-instances 1 --min-instances 0 --concurrency 250 --timeout 3600 --session-affinity --port 8080
```
