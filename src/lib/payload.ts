// 고백 정보는 서버 없이 링크의 # 뒤에 담는다 (서버로 전송되지 않음)

export interface Proposal {
  from: string
  to: string
  /** 처음 만난 날 YYYY-MM-DD (이 날이 1일) */
  met: string
  /** 기념일 일수 (100, 200, 365...) */
  days: number
  /** 데이트 일시 YYYY-MM-DDTHH:mm */
  when: string
  place: string
  msg?: string
  /** 상대 출생 연도 */
  born?: number
}

type Packed = [string, string, string, number, string, string, string, number]

function toBase64Url(bytes: Uint8Array) {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export function encodeProposal(p: Proposal): string {
  const packed: Packed = [p.from, p.to, p.met, p.days, p.when, p.place, p.msg ?? '', p.born ?? 0]
  return toBase64Url(new TextEncoder().encode(JSON.stringify(packed)))
}

export function decodeProposal(s: string): Proposal | null {
  try {
    const [from, to, met, days, when, place, msg, born] = JSON.parse(
      new TextDecoder().decode(fromBase64Url(s)),
    ) as Packed
    if (!from || !to || !met || !days || !when) return null
    return { from, to, met, days, when, place, msg: msg || undefined, born: born || undefined }
  } catch {
    return null
  }
}
