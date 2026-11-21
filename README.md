# SQUAD CLASH 2 (스쿼드 클래시 2)

[SQUAD CLASH](https://github.com/hookite-ops/SquadClash) 의 후속작 — 노트북 브라우저에서 바로 하는 멀티플레이 FPS.
폭탄전 · 팀 데스매치 · 생존전(배틀로얄), 방 목록·빠른 참가·방 코드, 봇, 상점, 무기고(스킨·파츠·스킨 코드)는 전작 그대로이고,

- **무기:** 오리지널 무기고 19 — 직접 설계한 무기와 휴머노이드 로봇 팔, 실제 손·동작(꺼내기·사격·장전·빈 탄창 장전·볼트·펌프·살펴보기)
- **정조준:** 무기 모델의 실제 가늠쇠·도트·조준경에 맞춰 화면 한가운데로
- 전작 스킨 코드가 그대로 통함

## 구성
- `server.js` — 게임 서버 (방, 라운드, 돈, 생존전, 봇, 피격 판정) · Node.js + ws
- `public/` — 화면 (Three.js r186)
  - `fpv.js` 1인칭 손·무기 · `guns.js` 무기 모델·스킨 · `shared.js` 무기 성능(서버와 같이 씀) · `maps.js`/`world.js` 맵
  - `assets/vm/*.glb` 무기고 19 모델 (meshopt 압축)
- 내 컴퓨터에서: `npm install && npm start` → http://localhost:8080

## Cloud Run 설정 (한 번)
방이 모두 서버 한 대에서 돌아야 같은 방 코드로 만날 수 있어요:
```
gcloud run services update squadclash2 --region asia-northeast3 --max-instances 1 --min-instances 0 --concurrency 250 --timeout 3600 --session-affinity --port 8080
```
