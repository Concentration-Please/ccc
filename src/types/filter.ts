export interface FilterOption {
  id: string
  label: string
}

export interface FilterGroup {
  id: string
  title: string
  options: FilterOption[]
  /**
   * `single` renders one dropdown, where an empty choice means the filter is off.
   * `multiple` renders toggle chips. Defaults to multiple.
   */
  selection?: 'single' | 'multiple'
}
