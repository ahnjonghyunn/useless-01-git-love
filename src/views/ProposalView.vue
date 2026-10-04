<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import confetti from 'canvas-confetti'
import type { Proposal } from '../lib/payload'
import { buildCommits, makeHash, seededRandom } from '../lib/commits'
import { annivLabel, branchName, dotDate, hhmm, koDate, parseDate, parseWhen } from '../lib/dates'
import { artToRows, brokenHeartArt, heartArt } from '../lib/ascii'
import DateTicket from '../components/DateTicket.vue'

const props = defineProps<{ p: Proposal }>()

type Seg = { t: string; c?: string }
type Line = { id: number; segs: Seg[]; cls?: string; cols?: number }

const commits = buildCommits(props.p)
const head = commits[commits.length - 1].hash
const mergeHash = makeHash(seededRandom(head))
const when = parseWhen(props.p.when)

const lines = ref<Line[]>([])
const phase = ref<'boot' | 'ask' | 'ci' | 'done'>('boot')
const screen = ref<HTMLElement>()
const area = ref<HTMLElement>()
const shaking = ref(false)

// ---------- 출력 엔진 ----------
let alive = true
let speed = 1
let uid = 0

const sleep = (ms: number) =>
  new Promise<void>((resolve, reject) =>
    setTimeout(() => (alive ? resolve() : reject(new Error('unmounted'))), ms * speed),
  )

function scrollDown() {
  nextTick(() => {
    if (screen.value) screen.value.scrollTop = screen.value.scrollHeight
  })
}

function print(...segs: Seg[]) {
  lines.value.push({ id: uid++, segs })
  scrollDown()
  return lines.value[lines.value.length - 1]
}

const s = (t: string, c?: string): Seg => ({ t, c })

/** 글자 그림을 한 줄씩 그린다 (그림 전체가 한 블록) */
async function draw(rows: string[], cls: string, delay: number) {
  if (!rows.length) return
  lines.value.push({ id: uid++, segs: [s('')], cls: `art ${cls}`, cols: rows[0].length })
  const line = lines.value[lines.value.length - 1]
  for (let i = 0; i < rows.length; i++) {
    line.segs[0].t += (i ? '\n' : '') + rows[i]
    scrollDown()
    await sleep(delay)
  }
  return line
}

async function type(cmd: string) {
  const line = print(s('➜ ', 'prompt'), s('~ ', 'path'), s('', 'cmd'))
  await sleep(380)
  for (const ch of cmd) {
    line.segs[2].t += ch
    scrollDown()
    await sleep(38 + Math.random() * 45)
  }
  await sleep(300)
}

function speedUp() {
  if (phase.value === 'boot') speed = 0.25
}

function shake() {
  shaking.value = false
  requestAnimationFrame(() => (shaking.value = true))
  setTimeout(() => (shaking.value = false), 500)
}

// ---------- Scene 1, 2: 커밋 로그 → 머지 요청 ----------
async function boot() {
  const { from, to, days, place, msg } = props.p
  print(s(`Last login: ${new Date().toDateString()} on ttys${String(days).padStart(3, '0')}`, 'dim'))
  await type(`cd love/${from}-and-${to}`)
  await type('git log --oneline --reverse')

  for (const c of commits) {
    print(s(c.hash + ' ', 'hash'), s(c.type + ': ', `type t-${c.type}`), s(c.msg), s(c.date ? `  ${c.date}` : '', 'dim'))
    await sleep(c.type === 'release' && c === commits[commits.length - 1] ? 700 : 420)
  }

  if (props.p.art) {
    await sleep(500)
    await type('cat 우리.jpg')
    await draw(artToRows(props.p.art), 'photo', 45)
  }

  await sleep(600)
  await type(`git merge proposal/${branchName(days)}`)
  print(s(`Updating ${head}..${mergeHash}`, 'dim'))
  print(s(' date.md | ', 'dim'), s(msg ? '4 ++++' : '3 +++', 'add'))
  await sleep(350)
  const diff: Seg[][] = [
    [s('+ 📅 ', 'add'), s(koDate(when))],
    [s('+ ⏰ ', 'add'), s(hhmm(when))],
    [s('+ 📍 ', 'add'), s(place)],
  ]
  if (msg) diff.push([s('+ 💬 ', 'add'), s(`"${msg}"`)])
  for (const d of diff) {
    print(...d)
    await sleep(260)
  }
  await sleep(500)
  print(s(''))
  ask()
}

function ask() {
  print(s('Merge this proposal? ', 'ask'), s('[Y/n] ', 'ask-dim'))
  phase.value = 'ask'
}

// ---------- Scene 3: n을 누르면 도망 ----------
const noCount = ref(0)
const noPos = reactive({ x: 0, y: 0 })
const noGone = ref(false)
const noScale = computed(() => Math.max(0.55, 1 - noCount.value * 0.15))
const yesScale = computed(() => 1 + Math.min(noCount.value, 4) * 0.08)

function flee() {
  const w = area.value?.clientWidth ?? 300
  noPos.x = -Math.random() * w * 0.45
  noPos.y = -(20 + Math.random() * 70)
}

function onNoHover(e: PointerEvent) {
  // 마우스는 두 번째 거절부터 버튼이 커서를 피해 다닌다
  if (e.pointerType === 'mouse' && noCount.value >= 2) flee()
}

async function onNo() {
  if (phase.value !== 'ask') return
  phase.value = 'boot'
  noCount.value++
  const { from, to } = props.p
  lines.value[lines.value.length - 1].segs.push(s('n', 'cmd'))
  shake()

  const conflicts: Seg[][][] = [
    [
      [s('CONFLICT (content): ', 'err'), s('Merge conflict in heart.js')],
      [s('<<<<<<< HEAD', 'err')],
      [s(`  const answer = "n"`)],
      [s('=======', 'dim')],
      [s(`  const answer = "Y"  `), s(`// ${from}의 간절한 바람`, 'dim')],
      [s('>>>>>>> proposal', 'add')],
      [s('Automatic merge failed; ', 'err'), s('마음을 고치고 다시 시도하세요.')],
    ],
    [
      [s('CONFLICT (modify/delete): ', 'err'), s('weekend.md')],
      [s(`  ${from}: 주말 비워둠 / ${to}: 삭제 시도`, 'dim')],
      [s('hint: ', 'warn'), s('거절은 지원되지 않는 기능입니다.')],
    ],
    [
      [s('warning: ', 'warn'), s(`'n' 키 입력이 비정상적으로 감지됨`)],
      [s('hint: ', 'warn'), s('Did you mean "Y"?')],
    ],
    [
      [s(`error: 'n' is not a valid option.`, 'err')],
      [s('  available: Y, y, yes, 응, 좋아', 'dim')],
    ],
  ]

  if (noCount.value >= 2) flee()
  if (noCount.value >= 4) noGone.value = true

  await sleep(150)
  for (const l of conflicts[Math.min(noCount.value, 4) - 1]) {
    print(...l)
    await sleep(110)
  }
  if (noCount.value === 1) {
    print(s(''))
    await draw(brokenHeartArt(), 'broken', 50)
  }
  print(s(''))
  ask()
}

// ---------- Scene 4: Y → CI 통과 → 티켓 ----------
async function onYes() {
  if (phase.value !== 'ask') return
  phase.value = 'ci'
  speed = 1
  lines.value[lines.value.length - 1].segs.push(s('Y', 'cmd'))
  await sleep(300)
  print(s(`Merge made by the 'heart' strategy.`, 'ok'))
  await sleep(500)
  await type('npm run ci')

  const { days } = props.p
  const steps: [string, string][] = [
    ['lint', '설렘 수치 정상 범위 (초과)'],
    ['test', `${days}/${days} passed`],
    ['build', `done in ${days} days`],
  ]
  const frames = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  for (const [name, desc] of steps) {
    const line = print(s('⠋ ', 'spin'), s(name.padEnd(6)), s(desc, 'dim'))
    for (let i = 0; i < 9; i++) {
      line.segs[0].t = frames[i % frames.length] + ' '
      await sleep(70)
    }
    line.segs[0] = s('✓ ', 'ok')
  }

  const bar = print(s('['), s('', 'bar'), s('                    ', 'dim'), s(']   0%'))
  for (let i = 1; i <= 20; i++) {
    bar.segs[1].t = '█'.repeat(i)
    bar.segs[2].t = ' '.repeat(20 - i)
    bar.segs[3].t = `] ${String(i * 5).padStart(3)}%`
    await sleep(45)
  }
  await sleep(250)
  print(s(''))
  print(s(` build #${days} `, 'badge-l'), s(' passing ✓ ', 'badge-r'))
  shake()
  await sleep(700)

  await type('./heart.sh')
  const heart = await draw(heartArt(), 'heart', 55)
  const { from, to, met } = props.p
  lines.value.push({ id: uid++, segs: [s(`${from} ♥ ${to}`)], cls: 'names' })
  lines.value.push({
    id: uid++,
    segs: [s(`since ${dotDate(parseDate(met))} · ${annivLabel(days)}`)],
    cls: 'names-sub',
  })
  scrollDown()
  if (heart) heart.cls += ' beat'
  celebrate()
  await sleep(2600)
  phase.value = 'done'
}

function celebrate() {
  const colors = ['#ff7eb6', '#f0428f', '#3fb950', '#ffffff', '#d2a8ff']
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 }, colors })
  setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 250)
  setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 400)
}

onMounted(() => boot().catch(() => {}))
onUnmounted(() => (alive = false))
</script>

<template>
  <div class="titlebar">
    <div class="dots"><i /><i /><i /></div>
    <span class="name">{{ p.to }}@love — zsh</span>
  </div>

  <div class="term" :class="{ shaking }">
    <div ref="screen" class="screen" @click="speedUp">
      <div
        v-for="l in lines"
        :key="l.id"
        class="line"
        :class="l.cls"
        :style="l.cols ? { '--cols': l.cols } : undefined"
      >
        <span v-for="(seg, i) in l.segs" :key="i" :class="seg.c">{{ seg.t }}</span>
      </div>
      <span class="cursor" />
    </div>

    <div ref="area" class="actions" :class="{ show: phase === 'ask' }">
      <button class="yes" type="button" :style="{ transform: `scale(${yesScale})` }" @click="onYes">
        [Y] 좋아
      </button>
      <button
        v-if="!noGone"
        class="no"
        type="button"
        :style="{ transform: `translate(${noPos.x}px, ${noPos.y}px) scale(${noScale})` }"
        @pointerenter="onNoHover"
        @click="onNo"
      >
        [n] 싫어
      </button>
    </div>
  </div>

  <Transition name="up">
    <DateTicket v-if="phase === 'done'" :p="p" :hash="mergeHash" />
  </Transition>
</template>

<style scoped>
.term {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.term.shaking {
  animation: shake 0.45s;
}
@keyframes shake {
  20% {
    transform: translateX(-7px);
  }
  40% {
    transform: translateX(6px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(2px);
  }
}

.screen {
  flex: 1;
  overflow-y: auto;
  padding: 16px 16px 8px;
  font-size: 13px;
  line-height: 1.75;
  scrollbar-width: none;
}
.screen::-webkit-scrollbar {
  display: none;
}

.line {
  white-space: pre-wrap;
  word-break: keep-all;
  overflow-wrap: anywhere;
  min-height: 1.75em;
}

/* 글자 그림: 화면 너비에 맞춰 글자 크기를 줄인다 */
.screen {
  container-type: inline-size;
}
.art {
  --cols: 40;
  white-space: pre;
  word-break: normal;
  overflow: hidden;
  text-align: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: min(12px, calc(100cqw / (var(--cols) * 0.62)));
  line-height: 1.05;
  margin: 6px 0;
}
.art.photo {
  color: #c9d1d9;
}
.art.broken {
  color: var(--red);
  font-weight: 700;
}
.art.heart {
  color: var(--pink);
  font-weight: 800;
  text-shadow: 0 0 12px rgba(255, 126, 182, 0.55);
}
.art.beat {
  animation: beat 1.1s ease-in-out infinite;
}
@keyframes beat {
  0%,
  100% {
    transform: scale(1);
  }
  14% {
    transform: scale(1.07);
  }
  28% {
    transform: scale(0.98);
  }
  42% {
    transform: scale(1.05);
  }
}
.names {
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  margin-top: 4px;
}
.names-sub {
  text-align: center;
  font-size: 11px;
  color: var(--dim);
}

.cursor {
  display: inline-block;
  width: 8px;
  height: 15px;
  background: var(--pink);
  vertical-align: -2px;
  animation: blink 1s steps(1) infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

.prompt {
  color: var(--green);
  font-weight: 700;
}
.path {
  color: var(--blue);
}
.cmd {
  color: var(--text);
}
.dim {
  color: var(--dim);
}
.hash {
  color: var(--yellow);
}
.type {
  color: var(--purple);
}
.t-release {
  color: var(--pink);
  font-weight: 700;
}
.t-init {
  color: var(--blue);
}
.t-fix,
.t-revert {
  color: var(--red);
}
.add,
.ok,
.bar {
  color: var(--green);
}
.err {
  color: var(--red);
}
.warn {
  color: var(--yellow);
}
.spin {
  color: var(--pink);
}
.ask {
  color: var(--pink);
  font-weight: 700;
}
.ask-dim {
  color: var(--text);
}
.badge-l,
.badge-r {
  font-weight: 800;
  font-size: 14px;
  padding: 3px 0;
}
.badge-l {
  background: #555;
  color: #fff;
  border-radius: 5px 0 0 5px;
}
.badge-r {
  background: var(--green);
  color: #04120a;
  border-radius: 0 5px 5px 0;
}

/* Y / n 버튼 */
.actions {
  position: relative;
  height: 150px;
  flex-shrink: 0;
  border-top: 1px solid var(--line);
  background: linear-gradient(to bottom, var(--panel), var(--bg));
  opacity: 0;
  pointer-events: none;
  transform: translateY(20px);
  transition:
    opacity 0.3s,
    transform 0.3s;
}
.actions.show {
  opacity: 1;
  pointer-events: auto;
  transform: none;
}
.actions button {
  position: absolute;
  bottom: 44px;
  width: 40%;
  height: 54px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 800;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.yes {
  left: 7%;
  border: 0;
  color: #fff;
  background: linear-gradient(135deg, var(--pink), var(--pink-deep));
  box-shadow: 0 8px 30px rgba(240, 66, 143, 0.35);
  transform-origin: center;
}
.no {
  right: 7%;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--dim);
  z-index: 2;
}

.up-enter-active {
  transition:
    transform 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.15),
    opacity 0.4s;
}
.up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
</style>
