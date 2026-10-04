<script setup lang="ts">
import { ref } from 'vue'
import { toPng } from 'html-to-image'
import type { Proposal } from '../lib/payload'
import { annivLabel, hhmm, koDate, parseWhen } from '../lib/dates'
import { seededRandom } from '../lib/commits'

const props = defineProps<{ p: Proposal; hash: string }>()

const when = parseWhen(props.p.when)

// 해시로 만드는 가짜 바코드
const rand = seededRandom(props.hash)
const bars = Array.from({ length: 46 }, () => 1 + Math.floor(rand() * 3))

const card = ref<HTMLElement>()
const saving = ref(false)

async function save() {
  if (!card.value) return
  saving.value = true
  try {
    const url = await toPng(card.value, { pixelRatio: 3 })
    const a = document.createElement('a')
    a.href = url
    a.download = `date-ticket-${props.hash}.png`
    a.click()
  } catch {
    alert('저장에 실패했어요. 화면을 캡처해 주세요 📸')
  } finally {
    saving.value = false
  }
}

const replay = () => location.reload()
</script>

<template>
  <div class="sheet">
    <div ref="card" class="ticket">
      <div class="top">
        <span class="kind">🎟️ DATE TICKET</span>
        <span class="build">BUILD #{{ p.days }} ✓</span>
      </div>

      <div class="route">
        <div>
          <small>FROM</small>
          <strong>{{ p.from }}</strong>
        </div>
        <span class="heart">♥</span>
        <div class="right">
          <small>TO</small>
          <strong>{{ p.to }}</strong>
        </div>
      </div>

      <div class="cut"><i /><span /><i /></div>

      <div class="grid">
        <div>
          <small>DATE</small>
          <b>{{ koDate(when) }}</b>
        </div>
        <div>
          <small>TIME</small>
          <b>{{ hhmm(when) }}</b>
        </div>
        <div class="wide">
          <small>PLACE</small>
          <b>{{ p.place }}</b>
        </div>
        <div v-if="p.msg" class="wide">
          <small>MESSAGE</small>
          <b class="msg">"{{ p.msg }}"</b>
        </div>
      </div>

      <div class="foot">
        <div class="barcode">
          <span v-for="(w, i) in bars" :key="i" :style="{ width: w + 'px' }" />
        </div>
        <div class="meta">
          <span>{{ annivLabel(p.days) }} 기념</span>
          <span>{{ hash }}</span>
        </div>
      </div>
    </div>

    <div class="btns">
      <button class="primary" type="button" :disabled="saving" @click="save">
        {{ saving ? '저장 중…' : '티켓 저장' }}
      </button>
      <button type="button" @click="replay">다시 보기</button>
    </div>
    <a class="make" href="./">나도 데이트 신청서 만들기 →</a>
  </div>
</template>

<style scoped>
.sheet {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px 22px;
  background: rgba(7, 9, 13, 0.72);
  backdrop-filter: blur(6px);
}

.ticket {
  background: linear-gradient(160deg, #fff7fb, #ffe3ef);
  color: #2b1020;
  border-radius: 18px;
  padding: 18px 18px 16px;
  box-shadow: 0 24px 60px rgba(240, 66, 143, 0.35);
  font-family: var(--mono);
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.build {
  background: #1f8f3a;
  color: #fff;
  padding: 3px 8px;
  border-radius: 999px;
}

.route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 18px 0 14px;
}
.route strong {
  display: block;
  font-size: 26px;
  font-weight: 800;
  margin-top: 2px;
}
.route .right {
  text-align: right;
}
.heart {
  font-size: 26px;
  color: var(--pink-deep);
  animation: beat 1s infinite;
}
@keyframes beat {
  15% {
    transform: scale(1.25);
  }
  30% {
    transform: scale(1);
  }
}

small {
  font-size: 10px;
  color: #a0607f;
  letter-spacing: 1px;
}

.cut {
  display: flex;
  align-items: center;
  margin: 0 -18px 14px;
}
.cut i {
  width: 14px;
  height: 22px;
  background: #0d1117;
}
.cut i:first-child {
  border-radius: 0 12px 12px 0;
}
.cut i:last-child {
  border-radius: 12px 0 0 12px;
}
.cut span {
  flex: 1;
  border-top: 2px dashed #f0b4cf;
  margin: 0 6px;
}

.grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px 10px;
}
.grid .wide {
  grid-column: 1 / -1;
}
.grid b {
  display: block;
  font-size: 15px;
  margin-top: 3px;
  word-break: keep-all;
}
.grid .msg {
  font-weight: 400;
  font-size: 14px;
}

.foot {
  margin-top: 18px;
}
.barcode {
  display: flex;
  justify-content: space-between;
  height: 34px;
}
.barcode span {
  background: #2b1020;
  border-radius: 1px;
}
.meta {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #a0607f;
  margin-top: 6px;
}

.btns {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}
.btns button {
  flex: 1;
  padding: 13px 0;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  font-size: 14px;
}
.btns .primary {
  flex: 1.4;
  border: 0;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(135deg, var(--pink), var(--pink-deep));
}

.make {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--dim);
}
</style>
