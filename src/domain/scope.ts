import { fa } from '../lib/format'
import type {
  Evidence,
  FieldKey,
  Origin,
  ScopeDoc,
  ScopeField,
  ScopeFields,
  UnknownItem,
  UnknownResolution,
} from './types'

export const FIELD_ORDER: FieldKey[] = [
  'goal',
  'audience',
  'deliverables',
  'exclusions',
  'reviewRounds',
  'constraints',
  'acceptance',
]

export const FIELD_META: Record<
  FieldKey,
  { label: string; en: string; hint: string; required: boolean; kind: 'text' | 'list' | 'number' }
> = {
  goal: {
    label: 'هدف پروژه',
    en: 'Goal',
    hint: 'پروژه می‌خواهد چه مشکلی را حل کند؟ در یک یا دو جمله.',
    required: true,
    kind: 'text',
  },
  audience: {
    label: 'مخاطب اصلی',
    en: 'Audience',
    hint: 'کاربران نهایی خروجی طراحی چه کسانی هستند؟',
    required: false,
    kind: 'text',
  },
  deliverables: {
    label: 'تحویل‌دادنی‌ها',
    en: 'Deliverables',
    hint: 'هر مورد یک خروجی مشخص و قابل تحویل باشد.',
    required: true,
    kind: 'list',
  },
  exclusions: {
    label: 'خارج از محدوده',
    en: 'Exclusions',
    hint: 'آنچه صریحاً جزو این توافق نیست.',
    required: true,
    kind: 'list',
  },
  reviewRounds: {
    label: 'تعداد دور بازبینی',
    en: 'Review rounds',
    hint: 'چند دور بازبینی در توافق داخلی لحاظ شده است؟',
    required: true,
    kind: 'number',
  },
  constraints: {
    label: 'محدودیت‌ها و مهلت‌ها',
    en: 'Constraints',
    hint: 'برند، فنی، زمانی یا هر قید دیگر.',
    required: false,
    kind: 'list',
  },
  acceptance: {
    label: 'معیار پذیرش',
    en: 'Acceptance criteria',
    hint: 'مشتری و استودیو با چه چیزی «تمام‌شده» را تشخیص می‌دهند؟',
    required: true,
    kind: 'list',
  },
}

export const ORIGIN_LABEL: Record<Origin, string> = {
  empty: 'خالی',
  ai: 'پیشنهاد AI',
  edited: 'ویرایش انسانی',
  human: 'نوشتهٔ شما',
}

function field<V>(value: V): ScopeField<V> {
  return { value, origin: 'empty', evidenceIds: [] }
}

export function emptyScope(): ScopeDoc {
  return {
    fields: {
      goal: field(''),
      audience: field(''),
      deliverables: field<string[]>([]),
      exclusions: field<string[]>([]),
      reviewRounds: field<number | null>(null),
      constraints: field<string[]>([]),
      acceptance: field<string[]>([]),
    },
    evidence: [],
    unknowns: [],
  }
}

export const cloneDoc = (doc: ScopeDoc): ScopeDoc => structuredClone(doc)

const nonBlank = (items: string[]) => items.map((s) => s.trim()).filter(Boolean)

export function isFieldEmpty<K extends FieldKey>(key: K, value: ScopeFields[K]['value']): boolean {
  if (key === 'reviewRounds') return value === null
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return nonBlank(value).length === 0
  return false
}

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** ویرایش انسانی یک فیلد؛ منشأ فیلد را طبق قاعده به‌روز می‌کند. */
export function editField<K extends FieldKey>(
  doc: ScopeDoc,
  key: K,
  value: ScopeFields[K]['value'],
): ScopeDoc {
  const prev = doc.fields[key] as ScopeField<ScopeFields[K]['value']>
  let origin: Origin
  if (prev.origin === 'ai' || prev.origin === 'edited') {
    origin = prev.aiValue !== undefined && sameValue(prev.aiValue, value) ? 'ai' : 'edited'
  } else {
    origin = isFieldEmpty(key, value) ? 'empty' : 'human'
  }
  const next: ScopeField<ScopeFields[K]['value']> = { ...prev, value, origin }
  return { ...doc, fields: { ...doc.fields, [key]: next } }
}

export function resolveUnknown(doc: ScopeDoc, unknownId: string, resolution: UnknownResolution): ScopeDoc {
  return {
    ...doc,
    unknowns: doc.unknowns.map((u) => (u.id === unknownId ? { ...u, resolution } : u)),
  }
}

export type AiFieldResult = {
  [K in FieldKey]?: { value: ScopeFields[K]['value']; evidenceIds: string[] }
}

export interface AiResult {
  fields: AiFieldResult
  evidence: Evidence[]
  unknowns: UnknownItem[]
}

/**
 * ادغام خروجی AI در پیش‌نویس. ویرایش‌های انسانی هرگز بازنویسی نمی‌شوند:
 * فقط فیلدهای «خالی» یا «پیشنهاد AI دست‌نخورده» به‌روز می‌شوند.
 */
export function applyAiResult(doc: ScopeDoc, result: AiResult): ScopeDoc {
  const fields = { ...doc.fields } as Record<FieldKey, ScopeField<unknown>>
  for (const key of FIELD_ORDER) {
    const suggestion = result.fields[key]
    if (!suggestion) continue
    const current = fields[key]
    if (current.origin === 'empty' || current.origin === 'ai') {
      fields[key] = {
        value: structuredClone(suggestion.value),
        origin: 'ai',
        evidenceIds: suggestion.evidenceIds,
        aiValue: structuredClone(suggestion.value),
      }
    } else {
      fields[key] = { ...current, aiValue: structuredClone(suggestion.value) }
    }
  }
  const evidenceIds = new Set(doc.evidence.map((e) => e.id))
  const unknownIds = new Set(doc.unknowns.map((u) => u.id))
  return {
    fields: fields as unknown as ScopeFields,
    evidence: [...doc.evidence, ...result.evidence.filter((e) => !evidenceIds.has(e.id))],
    unknowns: [...doc.unknowns, ...result.unknowns.filter((u) => !unknownIds.has(u.id))],
  }
}

/** حذف ردیف‌های خالی و فاصله‌های اضافی؛ پیش از ثبت Baseline */
export function compactDoc(doc: ScopeDoc): ScopeDoc {
  const next = cloneDoc(doc)
  next.fields.goal.value = next.fields.goal.value.trim()
  next.fields.audience.value = next.fields.audience.value.trim()
  next.fields.deliverables.value = nonBlank(next.fields.deliverables.value)
  next.fields.exclusions.value = nonBlank(next.fields.exclusions.value)
  next.fields.constraints.value = nonBlank(next.fields.constraints.value)
  next.fields.acceptance.value = nonBlank(next.fields.acceptance.value)
  return next
}

export interface Guard {
  id: string
  label: string
  ok: boolean
  /** پیام وقتی شرط برقرار نیست */
  problem: string
  field: FieldKey
}

export const isUnknownResolved = (u: UnknownItem) =>
  u.resolution.kind !== 'open' && u.resolution.note.trim().length > 0

/** شش شرط لازم پیش از تأیید داخلی محدوده */
export function validateScope(doc: ScopeDoc): Guard[] {
  const f = doc.fields
  const rounds = f.reviewRounds.value
  const openCritical = doc.unknowns.filter((u) => u.severity === 'critical' && !isUnknownResolved(u))
  return [
    {
      id: 'goal',
      label: 'هدف پروژه نوشته شده است',
      ok: !isFieldEmpty('goal', f.goal.value),
      problem: 'هدف پروژه خالی است.',
      field: 'goal',
    },
    {
      id: 'deliverables',
      label: 'تحویل‌دادنی‌ها مشخص‌اند',
      ok: !isFieldEmpty('deliverables', f.deliverables.value),
      problem: 'حداقل یک تحویل‌دادنی لازم است.',
      field: 'deliverables',
    },
    {
      id: 'exclusions',
      label: 'موارد خارج از محدوده مشخص‌اند',
      ok: !isFieldEmpty('exclusions', f.exclusions.value),
      problem: 'حداقل یک مورد خارج از محدوده لازم است؛ اگر چیزی مستثنا نیست، همین را صریح بنویسید.',
      field: 'exclusions',
    },
    {
      id: 'rounds',
      label: 'تعداد دور بازبینی معلوم است',
      ok: rounds !== null && Number.isInteger(rounds) && rounds >= 1 && rounds <= 20,
      problem: 'تعداد دور بازبینی را (عددی از ۱ تا ۲۰) مشخص کنید.',
      field: 'reviewRounds',
    },
    {
      id: 'acceptance',
      label: 'معیار پذیرش نوشته شده است',
      ok: !isFieldEmpty('acceptance', f.acceptance.value),
      problem: 'معیار پذیرش خالی است؛ بدون آن «تمام‌شدن» کار قابل تشخیص نیست.',
      field: 'acceptance',
    },
    {
      id: 'unknowns',
      label: 'ابهام‌های حیاتی بررسی یا به‌عنوان فرض مستند شده‌اند',
      ok: openCritical.length === 0,
      problem:
        openCritical.length === 1
          ? 'یک ابهام حیاتی هنوز باز است.'
          : `${fa(openCritical.length)} ابهام حیاتی هنوز باز است.`,
      field: openCritical[0]?.field ?? 'acceptance',
    },
  ]
}

export const canApprove = (doc: ScopeDoc) => validateScope(doc).every((g) => g.ok)
