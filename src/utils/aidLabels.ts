export function organizationLabel(isOrganization: boolean): string {
  return isOrganization ? '團體' : '個人'
}

export function registrationLabel(months: number | null): string {
  if (months === null) return '無設籍月數要求'
  return `設籍滿 ${months} 個月`
}
