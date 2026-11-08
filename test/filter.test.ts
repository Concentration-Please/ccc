import assert from 'node:assert/strict'
import test from 'node:test'
import categoryList from '../data/category.json' with { type: 'json' }
import labelMap from '../data/label.json' with { type: 'json' }
import indigenousFile from '../data/indigenous.json' with { type: 'json' }
import youthFile from '../data/youth.json' with { type: 'json' }
import {
  identityFilterId,
  identityFilterOptions,
  subsidyCategories,
} from '../src/services/filterCatalog.js'
import type { GovernmentAidRecord } from '../src/types/governmentAid.js'
import {
  applyFilter,
  recordMatchesFilterGroups,
  recordMatchesSearch,
} from '../src/services/filterQuery.js'

const baseAid: GovernmentAidRecord = {
  id: 1,
  label: [],
  category: '托育服務',
  is_organization: false,
  registration_months: 6,
  source_url: 'https://example.com/a',
  name: '托育補助',
  summary: '原住民家庭托育',
  subsidy_target: '學齡前兒童',
  conditions: ['須設籍臺北市'],
  application_method_or_documents: ['向區公所提出申請'],
}

const categoryB: GovernmentAidRecord = {
  ...baseAid,
  source_url: 'https://example.com/b',
  category: '教育扶助',
  name: '獎學金',
  summary: '原住民學生就學補助',
}

const orgGroup: GovernmentAidRecord = {
  ...baseAid,
  source_url: 'https://example.com/c',
  is_organization: true,
}

test('filter group options OR within group, AND across groups', () => {
  assert.equal(
    recordMatchesFilterGroups(baseAid, ['category:托育服務', 'category:教育扶助']),
    true,
  )
  assert.equal(recordMatchesFilterGroups(categoryB, ['category:托育服務', 'category:教育扶助']), true)
  assert.equal(
    recordMatchesFilterGroups(baseAid, ['category:教育扶助', 'category:長青服務']),
    false,
  )

  assert.equal(
    recordMatchesFilterGroups(baseAid, ['category:托育服務', 'is_organization:false']),
    true,
  )
  assert.equal(
    recordMatchesFilterGroups(orgGroup, ['category:托育服務', 'is_organization:false']),
    false,
  )
})

test('search matches name, summary, and requires all terms', () => {
  assert.equal(recordMatchesSearch(baseAid, '托育'), true)
  assert.equal(recordMatchesSearch(baseAid, '臺北'), true)
  assert.equal(recordMatchesSearch(baseAid, '區公所'), true)
  assert.equal(recordMatchesSearch(baseAid, '托育 原住民'), true)
  assert.equal(recordMatchesSearch(baseAid, '托育 不存在'), false)
})

test('age filter is inclusive and unbounded when a bound is null', () => {
  const bounded = { ...baseAid, age_lower: 18, age_upper: 35 }
  assert.equal(recordMatchesFilterGroups(bounded, ['age:18']), true)
  assert.equal(recordMatchesFilterGroups(bounded, ['age:35']), true)
  assert.equal(recordMatchesFilterGroups(bounded, ['age:17']), false)
  assert.equal(recordMatchesFilterGroups(bounded, ['age:36']), false)

  const openLower = { ...baseAid, age_lower: null, age_upper: 5 }
  assert.equal(recordMatchesFilterGroups(openLower, ['age:1']), true)
  assert.equal(recordMatchesFilterGroups(openLower, ['age:5']), true)
  assert.equal(recordMatchesFilterGroups(openLower, ['age:6']), false)

  const openUpper = { ...baseAid, age_lower: 60, age_upper: null }
  assert.equal(recordMatchesFilterGroups(openUpper, ['age:60']), true)
  assert.equal(recordMatchesFilterGroups(openUpper, ['age:100']), true)
  assert.equal(recordMatchesFilterGroups(openUpper, ['age:59']), false)

  const openBoth = { ...baseAid, age_lower: null, age_upper: null }
  assert.equal(recordMatchesFilterGroups(openBoth, ['age:1']), true)
  assert.equal(recordMatchesFilterGroups(openBoth, ['age:100']), true)
})

test('identity labels combine with AND', () => {
  const indigenous = { ...baseAid, label: ['indigenous'] }
  const youth = { ...baseAid, label: ['youth'] }
  const both = { ...baseAid, label: ['indigenous', 'youth'] }

  assert.equal(recordMatchesFilterGroups(indigenous, ['label:indigenous']), true)
  assert.equal(recordMatchesFilterGroups(indigenous, ['label:youth']), false)
  assert.equal(recordMatchesFilterGroups(youth, ['label:youth']), true)
  assert.equal(recordMatchesFilterGroups(both, ['label:indigenous', 'label:youth']), true)
  assert.equal(recordMatchesFilterGroups(indigenous, ['label:indigenous', 'label:youth']), false)
  assert.equal(recordMatchesFilterGroups(youth, ['label:indigenous', 'label:youth']), false)
})

test('registration months and audience keep exact matches', () => {
  assert.equal(recordMatchesFilterGroups(baseAid, ['registration_months:6']), true)
  assert.equal(recordMatchesFilterGroups(baseAid, ['registration_months:4']), false)
  assert.equal(recordMatchesFilterGroups(orgGroup, ['is_organization:true']), true)
  assert.equal(recordMatchesFilterGroups(baseAid, ['is_organization:false']), true)
})

test('applyFilter combines search and filters', () => {
  const aids = [baseAid, categoryB, orgGroup]
  const filtered = applyFilter(aids, {
    searchQuery: '托育',
    selectedOptionIds: ['category:托育服務', 'category:教育扶助', 'is_organization:false'],
  })
  assert.deepEqual(filtered.map((a) => a.source_url), [baseAid.source_url])
})

test('category filter follows category.json and includes categories only present on records', () => {
  const used = [...indigenousFile.records, ...youthFile.records].map((record) => record.category)
  const categories = subsidyCategories(categoryList, used)
  assert.deepEqual(categories, categoryList)
  for (const category of categories) {
    assert.equal(
      recordMatchesFilterGroups({ ...baseAid, category }, [`category:${category}`]),
      true,
    )
  }

  const withMissing = subsidyCategories(categoryList, [...used, '法律服務'])
  assert.deepEqual(withMissing.at(-1), '法律服務')
  assert.equal(withMissing.includes(categoryList[0]!), true)
})

test('身份別 options follow the label map', () => {
  assert.deepEqual(identityFilterOptions(labelMap), [
    { id: 'label:indigenous', label: '原住民' },
    { id: 'label:youth', label: '青年' },
  ])
  assert.equal(identityFilterId(labelMap, '原住民'), 'label:indigenous')
  assert.equal(identityFilterId(labelMap, '青年'), 'label:youth')
  assert.equal(identityFilterId({ elder: '長者' }, '長者'), 'label:elder')
  assert.equal(identityFilterId(labelMap, '長者'), null)
})
