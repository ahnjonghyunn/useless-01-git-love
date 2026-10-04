<template>
  <div class="stage">
    <div class="phone"><slot /></div>
  </div>
</template>

<style scoped>
.stage {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(60% 50% at 20% 10%, rgba(240, 66, 143, 0.14), transparent 70%),
    radial-gradient(50% 40% at 85% 90%, rgba(88, 166, 255, 0.12), transparent 70%),
    #07090d;
}

/* 폰에서는 전체 화면, PC에서는 9:16 폰 프레임 (그대로 녹화하면 릴스 비율) */
.phone {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}

@media (min-width: 600px) {
  .phone {
    --h: min(92dvh, 900px);
    height: var(--h);
    width: calc(var(--h) * 9 / 16);
    border-radius: 28px;
    border: 1px solid var(--line);
    box-shadow:
      0 0 0 8px #11151c,
      0 30px 80px rgba(0, 0, 0, 0.6),
      0 0 120px rgba(240, 66, 143, 0.12);
  }
}
</style>
