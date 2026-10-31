import type { Project, SnapshotRef } from './types'

/** Hash نمایشی و پایدار (نه رمزنگاری) برای نشان‌دادن «Snapshot ثابت» */
export function mockChecksum(seed: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < seed.length; i++) {
    h1 = Math.imul(h1 ^ seed.charCodeAt(i), 16777619)
    h2 = Math.imul(h2 + seed.charCodeAt(i), 2246822519)
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0')
  return `sha256:${hex(h1)}${hex(h2)}`
}

/** Snapshot نمونه: برای پروژهٔ بریف نمونه، صفحهٔ پرداخت؛ برای بقیه، قاب عمومی */
export function snapshotFor(project: Project, sequence: number): SnapshotRef {
  if (project.brief?.source === 'sample') return { kind: 'arma-checkout', variant: Math.min(sequence, 2) }
  return { kind: 'generic', variant: sequence }
}

export const DEFAULT_ARTIFACT_TITLE = (project: Project) =>
  project.brief?.source === 'sample' ? 'صفحهٔ پرداخت (Checkout)' : 'نسخهٔ طرح'
