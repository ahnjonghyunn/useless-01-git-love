// 릴스용 자동 녹화: 폰 화면(9:16)으로 만들기 → 고백 화면 → n 두 번 → Y → 티켓
// 사용법: node scripts/record-reel.mjs [출력폴더] [사이트주소]
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const OUT = process.argv[2] ?? 'C:/develop/_reels/01'
const BASE = process.argv[3] ?? 'http://localhost:4173/'
fs.mkdirSync(OUT, { recursive: true })

const FRAMES = path.join(OUT, 'frames')
fs.rmSync(FRAMES, { recursive: true, force: true })
fs.mkdirSync(FRAMES, { recursive: true })

// 360×640 화면을 3배 해상도로 → 1080×1920 프레임
const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 3,
  locale: 'ko-KR',
})

// 터치한 위치에 동그란 표시 (녹화에서 어디를 눌렀는지 보이게)
await context.addInitScript(() => {
  addEventListener('pointerdown', (e) => {
    const d = document.createElement('div')
    d.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.45);border:2px solid #fff;pointer-events:none;z-index:99999;transition:transform .45s ease-out,opacity .45s ease-out`
    document.documentElement.appendChild(d)
    requestAnimationFrame(() => {
      d.style.transform = 'scale(1.8)'
      d.style.opacity = '0'
    })
    setTimeout(() => d.remove(), 500)
  }, true)
})

const page = await context.newPage()
const events = {}
const mark = (name) => (events[name] = Date.now() / 1000)
const wait = (ms) => page.waitForTimeout(ms)

await page.goto(BASE)
await page.waitForSelector('h1')
await page.evaluate(() => document.fonts.ready)

// 브라우저 화면을 기기 해상도 그대로 프레임 단위로 받는다 (화면이 바뀔 때만 프레임이 옴)
const cdp = await context.newCDPSession(page)
const frames = []
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = path.join(FRAMES, `${String(frames.length).padStart(5, '0')}.jpg`)
  fs.writeFileSync(file, Buffer.from(data, 'base64'))
  frames.push({ file, ts: metadata.timestamp })
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920 })
mark('start')
await wait(700)

// 1) 만들기 페이지 입력
mark('form')
const typeInto = async (sel, text) => {
  await page.click(sel)
  await page.locator(sel).pressSequentially(text, { delay: 110 })
  await wait(250)
}
await typeInto('input[placeholder="내 이름"]', '종현')
await typeInto('input[placeholder="상대 이름"]', '성희')
await page.click('input[type="date"] >> nth=0')
await page.fill('input[type="date"] >> nth=0', '2026-08-20')
await wait(400)
await typeInto('input[placeholder^="상대 출생"]', '1997')
await page.locator('input[placeholder="데이트 장소"]').scrollIntoViewIfNeeded()
await typeInto('input[placeholder="데이트 장소"]', '성수동 레스토랑')
await typeInto('input[placeholder^="한마디"]', '맛있는 거 먹자')
await page.locator('.out').scrollIntoViewIfNeeded()
await wait(700)
const link = (await page.locator('.link').textContent()).trim()
await page.click('.btns .primary')
await wait(900)

// 2) 받는 사람 화면
mark('boot')
await page.goto(link)
await page.waitForSelector('.actions.show', { timeout: 90_000 })
mark('ask')
await wait(1400)

// 3) n 두 번
await page.click('.no')
mark('no1')
await page.waitForSelector('.actions.show', { timeout: 30_000 })
await wait(1500)
await page.click('.no')
mark('no2')
await page.waitForSelector('.actions.show', { timeout: 30_000 })
await wait(1300)

// 4) Y
await page.click('.yes')
mark('yes')
await page.waitForSelector('.art.heart', { timeout: 30_000 })
mark('heart')
await page.waitForSelector('.sheet', { timeout: 30_000 })
mark('ticket')
await wait(3500)
mark('end')

await cdp.send('Page.stopScreencast')
await context.close()
await browser.close()

// 프레임마다 다음 프레임까지의 시간을 적은 ffmpeg concat 목록
const t0 = frames[0].ts
const end = events.end
const list = frames
  .map((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].ts : end
    return `file '${f.file.replace(/\\/g, '/')}'\nduration ${Math.max(0.001, next - f.ts).toFixed(4)}`
  })
  .join('\n')
fs.writeFileSync(path.join(OUT, 'frames.txt'), `${list}\nfile '${frames.at(-1).file.replace(/\\/g, '/')}'\n`)

const rel = Object.fromEntries(Object.entries(events).map(([k, v]) => [k, +(v - t0).toFixed(3)]))
fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify(rel, null, 2))
console.log(frames.length, 'frames', JSON.stringify(rel))
