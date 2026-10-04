const DAY = 86_400_000
const WEEK = ['일', '월', '화', '수', '목', '금', '토']

const pad = (n: number) => String(n).padStart(2, '0')

export function parseDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function parseWhen(s: string) {
  const d = parseDate(s)
  const [hh, mm] = (s.split('T')[1] ?? '00:00').split(':').map(Number)
  d.setHours(hh, mm)
  return d
}

export function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const dotDate = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
export const koDate = (d: Date) => `${dotDate(d)} (${WEEK[d.getDay()]})`
export const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** 만난 날을 1일로 세는 한국식 기념일 */
export function anniversaryDate(met: string, days: number) {
  return addDays(parseDate(met), days - 1)
}

/** 오늘이 사귄 지 며칠째인지 (만난 날 = 1) */
export function dayCount(met: string, today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((t.getTime() - parseDate(met).getTime()) / DAY) + 1
}

export function annivLabel(days: number) {
  return days % 365 === 0 ? `${days / 365}주년` : `${days}일`
}

export function branchName(days: number) {
  return days % 365 === 0 ? `${days / 365}y-anniversary` : `${days}th-date`
}
