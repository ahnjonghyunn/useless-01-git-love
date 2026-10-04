// 터미널에 그리는 글자 그림들 (사진 변환, 하트, 깨진 하트)

const RAMP = ' .:-=+*#%@'
/** 고정폭 글꼴 한 칸의 가로/세로 비율 (line-height 1.05 기준) */
const CELL = 0.55

// ---------- 사진 → ASCII ----------

/** 사진을 cols 칸 너비의 밝기 단계(0~9)로 줄인 뒤 링크에 담을 문자열로 압축 */
export async function photoToArt(file: File, cols = 44): Promise<string> {
  const bmp = await createImageBitmap(file)

  // 너무 길쭉한 사진은 가운데만 잘라 쓴다
  let sx = 0
  let sy = 0
  let sw = bmp.width
  let sh = bmp.height
  if (sh / sw > 1.3) {
    sh = sw * 1.3
    sy = (bmp.height - sh) / 2
  } else if (sw / sh > 1.6) {
    sw = sh * 1.6
    sx = (bmp.width - sw) / 2
  }
  const rows = Math.max(8, Math.round(cols * (sh / sw) * CELL))

  // 한 번에 확 줄이면 계단 현상이 생겨서 중간 크기를 거친다
  const mid = document.createElement('canvas')
  mid.width = cols * 4
  mid.height = rows * 4
  const mctx = mid.getContext('2d')!
  mctx.imageSmoothingQuality = 'high'
  mctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, mid.width, mid.height)

  const out = document.createElement('canvas')
  out.width = cols
  out.height = rows
  const ctx = out.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(mid, 0, 0, cols, rows)
  const { data } = ctx.getImageData(0, 0, cols, rows)

  const lum: number[] = []
  for (let i = 0; i < data.length; i += 4) lum.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])

  // 대비를 늘려서 어두운 사진도 또렷하게
  const sorted = [...lum].sort((a, b) => a - b)
  const lo = sorted[Math.floor(sorted.length * 0.03)]
  const hi = sorted[Math.floor(sorted.length * 0.97)]
  const levels = lum.map((v) => {
    const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo || 1)))
    return Math.round(Math.pow(t, 0.9) * (RAMP.length - 1))
  })

  // 두 칸을 한 바이트에 (4비트씩)
  const bytes = new Uint8Array(Math.ceil(levels.length / 2))
  levels.forEach((lv, i) => (bytes[i >> 1] |= i % 2 ? lv : lv << 4))
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${cols}.${rows}.${b64}`
}

export function artToRows(art: string): string[] {
  try {
    const [c, r, b64] = art.split('.')
    const cols = Number(c)
    const rows = Number(r)
    const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
    const out: string[] = []
    for (let y = 0; y < rows; y++) {
      let line = ''
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x
        const byte = bin.charCodeAt(i >> 1)
        line += RAMP[i % 2 ? byte & 15 : byte >> 4] ?? ' '
      }
      out.push(line)
    }
    return out
  } catch {
    return []
  }
}

// ---------- 하트 ----------

/** 동그란 두 언덕 + 아래 삼각형으로 만든 하트 (가운데 홈이 또렷하게) */
function heartMask(w: number) {
  const h = Math.round(w * 0.9 * CELL)
  const mask: boolean[][] = []
  for (let r = 0; r < h; r++) {
    const y = 1.05 - (r / (h - 1)) * 2.2
    const row: boolean[] = []
    for (let c = 0; c < w; c++) {
      const x = -1.05 + (c / (w - 1)) * 2.1
      const lobe = (x + 0.5) ** 2 + (y - 0.5) ** 2 <= 0.27 || (x - 0.5) ** 2 + (y - 0.5) ** 2 <= 0.27
      const body = y <= 0.5 && y >= -1.1 && Math.abs(x) <= ((y + 1.1) / 1.6) * 1.02
      row.push(lobe || body)
    }
    mask.push(row)
  }
  // 위아래 빈 줄 제거
  return mask.filter((row) => row.some(Boolean))
}

/** 'love' 글자로 채운 큰 하트 */
export function heartArt(w = 33, fill = 'love'): string[] {
  return heartMask(w).map((row) => {
    let k = 0
    return row.map((on) => (on ? fill[k++ % fill.length] : ' ')).join('')
  })
}

/** 가운데에 금이 간 작은 하트 */
export function brokenHeartArt(w = 21): string[] {
  const mid = Math.floor(w / 2)
  return heartMask(w).map((row, r) => {
    const crack = mid + (r % 2 ? 1 : 0)
    return row
      .map((on, c) => {
        if (!on) return ' '
        if (c === crack) return ' '
        if (c === crack + 1) return r % 2 ? '\\' : '/'
        return on ? '#' : ' '
      })
      .join('')
  })
}
