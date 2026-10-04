<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { encodeProposal } from '../lib/payload'
import { annivLabel, anniversaryDate, branchName, dayCount, koDate, ymd } from '../lib/dates'
import { artToRows, photoToArt } from '../lib/ascii'

const OPTIONS = [100, 200, 300, 365]

const form = reactive({
  from: '',
  to: '',
  met: '',
  days: 100,
  date: '',
  time: '18:00',
  place: '',
  msg: '',
  born: '',
})

// 데이트 날짜를 직접 고치기 전까지는 기념일 날짜를 자동으로 채운다
const dateTouched = ref(false)
const anniv = computed(() => (form.met ? anniversaryDate(form.met, form.days) : null))
watch(anniv, (d) => {
  if (d && !dateTouched.value) form.date = ymd(d)
})

const today = computed(() => (form.met ? dayCount(form.met) : 0))

// 사진은 링크에 담을 수 있도록 ASCII 아트로 바꿔서 보관 (원본은 어디에도 올라가지 않음)
const art = ref('')
const artPreview = computed(() => artToRows(art.value).join('\n'))
const photoInput = ref<HTMLInputElement>()
async function onPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    art.value = await photoToArt(file)
  } catch {
    alert('이 사진은 변환할 수 없어요. 다른 사진을 골라주세요.')
  }
}
function removePhoto() {
  art.value = ''
  if (photoInput.value) photoInput.value.value = ''
}

const ready = computed(
  () => !!(form.from.trim() && form.to.trim() && form.met && form.date && form.time && form.place.trim()),
)

const link = computed(() => {
  if (!ready.value) return ''
  const born = Number(form.born)
  const data = encodeProposal({
    from: form.from.trim(),
    to: form.to.trim(),
    met: form.met,
    days: form.days,
    when: `${form.date}T${form.time}`,
    place: form.place.trim(),
    msg: form.msg.trim() || undefined,
    born: born >= 1900 && born <= 2100 ? born : undefined,
    art: art.value || undefined,
  })
  return `${location.origin}${location.pathname}#/p/${data}`
})

const copied = ref(false)
async function copy() {
  await navigator.clipboard.writeText(link.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}

const canShare = typeof navigator !== 'undefined' && 'share' in navigator
async function share() {
  try {
    await navigator.share({
      title: '💌 merge 요청이 도착했습니다',
      text: `${form.to}님, Pull Request가 도착했습니다. Merge this proposal? [Y/n]`,
      url: link.value,
    })
  } catch {
    /* 공유 취소 */
  }
}

function preview() {
  window.open(link.value, '_blank')
}
</script>

<template>
  <div class="titlebar"><div class="dots"><i /><i /><i /></div><span class="name">~/useless-01-git-love</span></div>

  <main class="create">
    <p class="cmd"><span class="g">$</span> git init proposal</p>
    <h1><em>데이트 신청서</em><br />생성기</h1>
    <p class="sub">
      링크를 받은 사람은 터미널에서 <b>merge 요청</b>을 받습니다.<br />
      거절하면… <span class="r">merge conflict</span>.
    </p>

    <section class="fields">
      <label>
        <span class="flag">--from</span>
        <input v-model="form.from" placeholder="내 이름" maxlength="12" />
      </label>
      <label>
        <span class="flag">--to</span>
        <input v-model="form.to" placeholder="상대 이름" maxlength="12" />
      </label>
      <label>
        <span class="flag">--since</span>
        <input v-model="form.met" type="date" />
      </label>
      <label>
        <span class="flag">--born</span>
        <input v-model="form.born" type="number" inputmode="numeric" placeholder="상대 출생 연도 (선택)" />
      </label>

      <div class="field">
        <span class="flag">--days</span>
        <div class="chips">
          <button
            v-for="d in OPTIONS"
            :key="d"
            type="button"
            :class="{ on: form.days === d }"
            @click="form.days = d"
          >
            {{ annivLabel(d) }}
          </button>
        </div>
      </div>
      <p v-if="anniv" class="hint">
        → {{ annivLabel(form.days) }} = <b>{{ koDate(anniv) }}</b> · 오늘 D+{{ today }}
      </p>

      <label>
        <span class="flag">--date</span>
        <input v-model="form.date" type="date" @input="dateTouched = true" />
      </label>
      <label>
        <span class="flag">--time</span>
        <input v-model="form.time" type="time" />
      </label>
      <label>
        <span class="flag">--place</span>
        <input v-model="form.place" placeholder="데이트 장소" maxlength="30" />
      </label>
      <label>
        <span class="flag">-m</span>
        <input v-model="form.msg" placeholder="한마디 (선택)" maxlength="40" />
      </label>

      <div class="field photo">
        <span class="flag">--photo</span>
        <button v-if="!art" type="button" class="pick" @click="photoInput?.click()">
          둘이 찍은 사진 고르기 (선택)
        </button>
        <template v-else>
          <span class="done">✓ 우리.jpg → ASCII</span>
          <button type="button" class="remove" @click="removePhoto">삭제</button>
        </template>
        <input ref="photoInput" type="file" accept="image/*" hidden @change="onPhoto" />
      </div>
      <pre v-if="art" class="art-preview">{{ artPreview }}</pre>
      <p v-if="art" class="hint">→ 사진은 글자 그림으로만 링크에 담겨요. 원본은 어디에도 올라가지 않아요.</p>
    </section>

    <section class="out" :class="{ ready }">
      <p class="cmd">
        <span class="g">$</span> git push origin proposal/{{ branchName(form.days) }}
      </p>
      <template v-if="ready">
        <div class="link">{{ link }}</div>
        <div class="btns">
          <button class="primary" type="button" @click="copy">{{ copied ? '✓ 복사됨' : '링크 복사' }}</button>
          <button v-if="canShare" type="button" @click="share">공유</button>
          <button type="button" @click="preview">미리보기</button>
        </div>
      </template>
      <p v-else class="hint">error: 필수 옵션을 채워주세요 (--from --to --since --date --place)</p>
    </section>

    <footer>무쓸모 연구소 · useless #01</footer>
  </main>
</template>

<style scoped>
.create {
  flex: 1;
  overflow-y: auto;
  padding: 22px 20px 28px;
}

.cmd {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--dim);
}
.g {
  color: var(--green);
}
.r {
  color: var(--red);
}

h1 {
  margin: 0 0 12px;
  font-size: 30px;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: -0.5px;
}
h1 em {
  font-style: normal;
  color: var(--pink);
}

.sub {
  margin: 0 0 26px;
  color: var(--dim);
  font-size: 13px;
  line-height: 1.7;
}
.sub b {
  color: var(--text);
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

label,
.field {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0 12px;
  min-height: 46px;
  transition: border-color 0.15s;
}
label:focus-within {
  border-color: var(--pink);
}

.flag {
  color: var(--purple);
  font-size: 12px;
  width: 58px;
  flex-shrink: 0;
}

input {
  flex: 1;
  min-width: 0;
  background: none;
  border: 0;
  outline: 0;
  font-size: 14px;
  padding: 12px 0;
}
input::placeholder {
  color: #4b535d;
}
input[type='number']::-webkit-inner-spin-button {
  display: none;
}

.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 8px 0;
}
.chips button {
  border: 1px solid var(--line);
  background: none;
  border-radius: 999px;
  padding: 5px 11px;
  font-size: 12px;
  color: var(--dim);
}
.chips button.on {
  border-color: var(--pink);
  background: rgba(255, 126, 182, 0.12);
  color: var(--pink);
}

.photo .pick {
  flex: 1;
  text-align: left;
  background: none;
  border: 0;
  padding: 12px 0;
  font-size: 14px;
  color: #6e7681;
}
.photo .done {
  flex: 1;
  font-size: 13px;
  color: var(--green);
}
.photo .remove {
  background: none;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--dim);
}
.art-preview {
  margin: 0;
  padding: 10px 0;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  text-align: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 7px;
  line-height: 1.05;
  color: #c9d1d9;
  overflow: hidden;
}

.hint {
  margin: 0 2px;
  font-size: 12px;
  color: var(--dim);
  line-height: 1.6;
}
.hint b {
  color: var(--green);
}

.out {
  margin-top: 26px;
  padding: 16px;
  border-radius: 12px;
  border: 1px dashed var(--line);
}
.out.ready {
  border: 1px solid rgba(255, 126, 182, 0.45);
  background: rgba(255, 126, 182, 0.05);
}
.out .cmd {
  color: var(--text);
}
.link {
  font-size: 11px;
  color: var(--blue);
  word-break: break-all;
  max-height: 3.6em;
  overflow: hidden;
  margin-bottom: 14px;
  opacity: 0.8;
}
.btns {
  display: flex;
  gap: 8px;
}
.btns button {
  flex: 1;
  padding: 11px 0;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  font-size: 13px;
}
.btns .primary {
  flex: 1.4;
  border: 0;
  background: linear-gradient(135deg, var(--pink), var(--pink-deep));
  color: #fff;
  font-weight: 700;
}

footer {
  margin-top: 28px;
  text-align: center;
  font-size: 11px;
  color: #4b535d;
}
</style>
