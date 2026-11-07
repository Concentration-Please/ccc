import { indigenousRecords } from '@/data/indigenousDataset'
import type { FilterGroup, FilterOption } from '@/types/filter'
import type { GovernmentAidRecord } from '@/types/governmentAid'

/** IPC 為民服務類別順序（對應官頁 / 設計稿）；不含場地租借、原民問答。 */
const CATEGORY_DISPLAY_ORDER = [
  '托育服務',
  '長青服務',
  '教育扶助',
  '急難救助',
  '衛生扶助',
  '居住照顧',
  '貸款利息補貼',
  '住宅建購、修繕補助',
  '職業訓練相關補助',
  '其他補助',
  '體育補助',
  '原住民團體',
  '法律服務',
] as const

const EXCLUDED_CATEGORIES = new Set(['本會場地租借', '場地租借', '原民問答'])

function uniqueSortedCategories(records: GovernmentAidRecord[]): string[] {
  const inData = new Set(
    records.map((r) => r.category).filter((c) => !EXCLUDED_CATEGORIES.has(c)),
  )
  const ordered = CATEGORY_DISPLAY_ORDER.filter((c) => inData.has(c))
  const remainder = [...inData]
    .filter((c) => !CATEGORY_DISPLAY_ORDER.includes(c as (typeof CATEGORY_DISPLAY_ORDER)[number]))
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  return [...ordered, ...remainder]
}

function registrationMonthLabel(value: number | null): string {
  if (value === null) return '不限'
  return `${value} 個月`
}

export function buildSubsidyFilterGroups(records: GovernmentAidRecord[]): FilterGroup[] {
  const categoryOptions: FilterOption[] = uniqueSortedCategories(records).map((category) => ({
    id: `category:${category}`,
    label: category,
  }))

  const orgInData = new Set(records.map((r) => r.is_organization))
  const organizationOptions: FilterOption[] = []
  if (orgInData.has(true)) {
    organizationOptions.push({ id: 'is_organization:true', label: '團體' })
  }
  if (orgInData.has(false)) {
    organizationOptions.push({ id: 'is_organization:false', label: '個人' })
  }

  const monthsInData = new Set(records.map((r) => r.registration_months))
  const monthValues = [...monthsInData].sort((a, b) => {
    if (a === null) return 1
    if (b === null) return -1
    return a - b
  })
  const registrationOptions: FilterOption[] = monthValues.map((value) => ({
    id: `registration_months:${value === null ? 'null' : value}`,
    label: registrationMonthLabel(value),
  }))

  return [
    { id: 'category', title: '補貼類型', options: categoryOptions },
    { id: 'is_organization', title: '團體/個人', options: organizationOptions },
    { id: 'registration_months', title: '設籍時間', options: registrationOptions },
  ]
}

export const SUBSIDY_FILTER_GROUPS = buildSubsidyFilterGroups(indigenousRecords)
