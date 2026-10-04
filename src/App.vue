<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import PhoneFrame from './components/PhoneFrame.vue'
import CreateView from './views/CreateView.vue'
import ProposalView from './views/ProposalView.vue'
import { decodeProposal } from './lib/payload'

// 페이지가 2개뿐이라 라우터 없이 #/p/<데이터> 여부로 화면을 고른다
const hash = ref(location.hash)
const onHash = () => (hash.value = location.hash)
onMounted(() => window.addEventListener('hashchange', onHash))
onUnmounted(() => window.removeEventListener('hashchange', onHash))

const isProposal = computed(() => hash.value.startsWith('#/p/'))
const proposal = computed(() => (isProposal.value ? decodeProposal(hash.value.slice(4)) : null))
</script>

<template>
  <PhoneFrame>
    <ProposalView v-if="proposal" :key="hash" :p="proposal" />
    <div v-else-if="isProposal" class="broken">
      <div class="titlebar"><div class="dots"><i /><i /><i /></div><span class="name">zsh</span></div>
      <pre>
<span class="r">fatal:</span> 'proposal' does not appear to be a git repository
<span class="d">링크가 잘렸거나 손상됐어요.</span>

<a href="./">→ 새 데이트 신청서 만들기</a></pre>
    </div>
    <CreateView v-else />
  </PhoneFrame>
</template>

<style scoped>
.broken pre {
  margin: 0;
  padding: 20px 16px;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}
.r {
  color: var(--red);
}
.d {
  color: var(--dim);
}
a {
  color: var(--pink);
}
</style>
