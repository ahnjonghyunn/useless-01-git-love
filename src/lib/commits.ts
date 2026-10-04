import type { Proposal } from './payload'
import { addDays, anniversaryDate, dotDate, parseDate } from './dates'

export interface Commit {
  hash: string
  type: string
  msg: string
  date?: string
}

/** 같은 링크는 항상 같은 커밋 로그가 나오도록 시드 고정 난수 */
export function seededRandom(seed: string) {
  let h = 2166136261
  for (const c of seed) {
    h ^= c.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return (h >>> 0) / 4294967296
  }
}

export function makeHash(rand: () => number) {
  return Array.from({ length: 7 }, () => Math.floor(rand() * 16).toString(16)).join('')
}

const POOL: ((to: string, from: string) => [string, string])[] = [
  () => ['feat', '첫 데이트 성공 (deploy to 현실)'],
  () => ['fix', '심장 박동 과다 버그 → wontfix'],
  () => ['chore', '매일 밤 연락 cron 등록 (0 23 * * *)'],
  () => ['perf', '보고 싶은 마음 O(n²)으로 증가'],
  (to) => ['refactor', `모든 주말 → ${to}에게 할당`],
  (to) => ['docs', `${to} 좋아하는 음식 README 업데이트`],
  () => ['test', '손잡기 integration test passed'],
  () => ['style', '거울 앞 15분 추가 (lint 통과 목적)'],
  () => ['feat', "'보고싶다' API rate limit 해제"],
  () => ['fix', '답장 latency 3s → 0.2s 개선'],
  () => ['revert', "'오늘은 일찍 잘게' (거짓말이었음)"],
  () => ['build', '같이 찍은 사진 1,024장 캐시 완료'],
  (to) => ['ci', `하루 종일 ${to} 생각 파이프라인 구축`],
  (_to, from) => ['security', `${from}의 마음, 접근 권한 1명으로 제한`],
]

export function buildCommits(p: Proposal): Commit[] {
  const rand = seededRandom(`${p.from}|${p.to}|${p.met}|${p.days}`)
  const met = parseDate(p.met)
  const anniv = anniversaryDate(p.met, p.days)
  const commits: Commit[] = []

  if (p.born) {
    commits.push({ hash: makeHash(rand), type: 'release', msg: `${p.to} v${p.born}.0.0 출시 (명작)`, date: String(p.born) })
  }
  commits.push({ hash: makeHash(rand), type: 'init', msg: `${p.to} 발견`, date: dotDate(met) })

  // 풀에서 4개를 섞어 뽑고, 만난 날~기념일 사이 날짜에 순서대로 배치
  const picks = [...POOL].sort(() => rand() - 0.5).slice(0, 4)
  const span = p.days - 1
  picks.forEach((make, i) => {
    const [type, msg] = make(p.to, p.from)
    const offset = Math.max(1, Math.round((span * (i + 1)) / (picks.length + 1)))
    commits.push({ hash: makeHash(rand), type, msg, date: dotDate(addDays(met, offset)) })
  })

  commits.push({ hash: makeHash(rand), type: 'release', msg: `D+${p.days} 🎉`, date: dotDate(anniv) })
  return commits
}
