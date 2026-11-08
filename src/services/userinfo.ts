import labelMap from '../../data/label.json'
import { identityFilterId } from './filterCatalog'
import { ageInYears } from './matchSubscription'

/** TownPass nativePeople maps to the 身份別 named 原住民 in data/label.json. */
const INDIGENOUS_ID = identityFilterId(labelMap, '原住民')
const MIN_AGE = 1
const MAX_AGE = 100

export interface ImportedUserInfo {
  birthday?: unknown
  nativePeople?: unknown
}

/** TownPass sends birthday as yyyy/MM/dd. Full years, using the local calendar. */
export function ageFromTownPassBirthday(birthday: string, today = new Date()): number | null {
  return ageInYears(birthday.trim().replaceAll('/', '-'), today)
}

/** Select 原住民 when nativePeople is true, and the matching 年齡 option from birthday. */
export function applyUserInfoFilters(
  selectedIds: readonly string[],
  info: ImportedUserInfo,
  today = new Date(),
): string[] {
  let next = [...selectedIds]
  if (INDIGENOUS_ID && info.nativePeople === true && !next.includes(INDIGENOUS_ID)) {
    next.push(INDIGENOUS_ID)
  }
  if (typeof info.birthday !== 'string') return next
  const age = ageFromTownPassBirthday(info.birthday, today)
  if (age == null || age < MIN_AGE || age > MAX_AGE) return next
  next = next.filter((id) => !id.startsWith('age:'))
  next.push(`age:${age}`)
  return next
}
