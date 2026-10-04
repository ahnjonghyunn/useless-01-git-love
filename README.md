# 💌 useless-01-git-love

> 무쓸모 연구소 #01 — 개발자식 100일 데이트 신청

링크를 받은 사람은 터미널 화면에서 둘의 연애 커밋 로그를 보고,
`Merge this proposal? [Y/n]` 질문을 받습니다.

- **n** → merge conflict가 나고 버튼이 도망갑니다
- **Y** → CI 통과, `build passing ✓`, 데이트 티켓 발급 🎟️

## 사용법
1. 페이지에서 이름, 처음 만난 날, 데이트 날짜·장소를 입력
2. 생성된 링크를 상대에게 전송

입력한 정보는 서버로 전송되지 않고 링크 주소(`#` 뒤)에만 담깁니다.

## 개발
```bash
npm install
npm run dev
npm run build
```

Vue 3 · Vite · TypeScript · canvas-confetti · html-to-image
