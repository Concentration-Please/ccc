import categoryList from '@data/category.json'
import type { FilterGroup, FilterOption } from '@/types/filter'

const ageOptions: FilterOption[] = Array.from({ length: 100 }, (_, index) => {
  const age = index + 1
  return { id: `age:${age}`, label: String(age) }
})

const identityOptions: FilterOption[] = [
  { id: 'label:indigenous', label: '原住民' },
  { id: 'label:youth', label: '青年' },
]

const registrationOptions: FilterOption[] = [
  { id: 'registration_months:4', label: '4個月' },
  { id: 'registration_months:6', label: '6個月' },
]

const audienceOptions: FilterOption[] = [
  { id: 'is_organization:false', label: '個人' },
  { id: 'is_organization:true', label: '團體' },
]

const categoryOptions: FilterOption[] = categoryList.map((category) => ({
  id: `category:${category}`,
  label: category,
}))

export const SUBSIDY_FILTER_GROUPS: FilterGroup[] = [
  { id: 'age', title: '年齡', options: ageOptions, selection: 'single' },
  { id: 'label', title: '身份別', options: identityOptions },
  { id: 'registration_months', title: '設籍時間', options: registrationOptions, selection: 'single' },
  { id: 'category', title: '補貼類型', options: categoryOptions },
  { id: 'is_organization', title: '補貼對象', options: audienceOptions, selection: 'single' },
]

export const SUBSIDY_CATEGORIES: readonly string[] = categoryList
