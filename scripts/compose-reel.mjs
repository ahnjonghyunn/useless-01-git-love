// 녹화 프레임 + 장면별 자막 → 1080×1920 릴스 mp4
// 사용법: node scripts/compose-reel.mjs [녹화폴더]
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const OUT = process.argv[2] ?? 'C:/develop/_reels/01'
const ev = JSON.parse(fs.readFileSync(path.join(OUT, 'events.json'), 'utf8'))

// [시작, 끝, 큰 자막, 작은 자막]
const captions = [
  [0, ev.boot, '개발자가', '100일 데이트 신청하는 법'],
  [ev.boot, ev.boot + 6.5, '우리 연애 기록을', 'git log로 보여주고'],
  [ev.boot + 6.5, ev.no1, '데이트 신청을', 'merge 요청으로 보냄'],
  [ev.no1, ev.no2, '거절하면…', 'merge conflict 💔'],
  [ev.no2, ev.yes, '싫어 버튼은', '도망감'],
  [ev.yes, ev.heart, '수락하면', '빌드 성공'],
  [ev.heart, ev.ticket, '마음 출력 완료', ''],
  [ev.ticket, ev.end, '데이트 티켓 발급 완료', '링크는 프로필에서'],
]

const capDir = path.join(OUT, 'caps')
fs.mkdirSync(capDir, { recursive: true })
const FONT = 'C\\:/Windows/Fonts/malgunbd.ttf'

/** 화면 너비(여백 제외 960px)에 맞게 글자 크기를 줄인다. 한글은 1칸, 영문·숫자는 약 0.55칸 */
function fit(text, max) {
  const width = [...text].reduce((n, ch) => n + (/[ㄱ-힝]/.test(ch) ? 1 : 0.55), 0)
  return Math.min(max, Math.floor(960 / width))
}

const filters = ['fps=30', 'scale=1080:1920:flags=lanczos', 'format=yuv420p']
captions.forEach(([a, b, big, small], i) => {
  // drawtext는 컬러 이모지를 못 그려서 제거
  const clean = (t) => t.replace(/\p{Extended_Pictographic}/gu, '').trim()
  const enable = `enable='between(t,${a.toFixed(2)},${b.toFixed(2)})'`
  fs.writeFileSync(path.join(capDir, `${i}a.txt`), clean(big))
  filters.push(
    `drawtext=fontfile='${FONT}':textfile='caps/${i}a.txt':fontsize=${fit(clean(big), 72)}:fontcolor=white:` +
      `box=1:boxcolor=black@0.62:boxborderw=26:x=(w-tw)/2:y=250:${enable}`,
  )
  if (small) {
    fs.writeFileSync(path.join(capDir, `${i}b.txt`), clean(small))
    filters.push(
      `drawtext=fontfile='${FONT}':textfile='caps/${i}b.txt':fontsize=${fit(clean(small), 62)}:fontcolor=0xff7eb6:` +
        `box=1:boxcolor=black@0.62:boxborderw=22:x=(w-tw)/2:y=372:${enable}`,
    )
  }
})

fs.writeFileSync(path.join(OUT, 'filter.txt'), filters.join(',\n'))

execFileSync(
  'ffmpeg',
  [
    '-y', '-v', 'error',
    '-f', 'concat', '-safe', '0', '-i', 'frames.txt',
    '-/filter:v', 'filter.txt',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    'reel.mp4',
  ],
  { cwd: OUT, stdio: 'inherit' },
)
console.log('done →', path.join(OUT, 'reel.mp4'))
