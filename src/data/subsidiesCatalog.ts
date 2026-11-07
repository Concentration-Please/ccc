import categoryList from '@data/category.json'
import { indigenousRecords } from '@/data/indigenousDataset'
import type { FilterGroup, FilterOption } from '@/types/filter'
import type { GovernmentAidRecord } from '@/types/governmentAid'

function registrationMonthLabel(value: number | null): string {
  if (value === null) return '不限'
  return `${value} 個月`
}

export function buildSubsidyFilterGroups(records: GovernmentAidRecord[]): FilterGroup[] {
  const categoryOptions: FilterOption[] = categoryList.map((category) => ({
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

export const SUBSIDY_CATEGORIES: readonly string[] = categoryList
