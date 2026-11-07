import assert from 'node:assert/strict'
import test from 'node:test'
import type { GovernmentAidRecord } from '../src/types/governmentAid.js'
import {
  applyFilter,
  recordMatchesFilterGroups,
  recordMatchesSearch,
} from '../src/services/filterQuery.js'

const baseAid: GovernmentAidRecord = {
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

test('applyFilter combines search and filters', () => {
  const aids = [baseAid, categoryB, orgGroup]
  const filtered = applyFilter(aids, {
    searchQuery: '托育',
    selectedOptionIds: ['category:托育服務', 'category:教育扶助', 'is_organization:false'],
  })
  assert.deepEqual(filtered.map((a) => a.source_url), [baseAid.source_url])
})
