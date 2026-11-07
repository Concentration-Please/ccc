import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ageInYears,
  hasDuplicatePersona,
  matchesSubscription,
  personaCriteriaEqual,
  type MatchableAid,
  type Persona,
} from '../src/services/matchSubscription.js'
import { uniqueNotifications } from '../src/services/subscription.js'

const today = new Date(2026, 10, 7)

const baseAid: MatchableAid = {
  classification: '托育服務',
  isOrganization: false,
  registrationMonths: null,
  ageLower: null,
  ageUpper: null,
  isNative: null,
}

function persona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 'persona-1',
    birthDate: '1996-01-01',
    identity: 'is_organization:false',
    categoryIds: [],
    tagIds: [],
    ...overrides,
  }
}

test('counts full years from a birth date', () => {
  assert.equal(ageInYears('1996-01-01', today), 30)
  assert.equal(ageInYears('1996-12-01', today), 29)
  assert.equal(ageInYears('1996-02-31', today), null)
})

test('matches when category and tag are unset and the aid has no age bounds', () => {
  assert.equal(matchesSubscription(baseAid, [persona()], today), true)
})

test('matches the union of personas', () => {
  const miss = persona({ id: 'miss', categoryIds: ['category:貸款'] })
  const hit = persona({ id: 'hit', categoryIds: ['category:托育服務'] })
  assert.equal(matchesSubscription(baseAid, [miss], today), false)
  assert.equal(matchesSubscription(baseAid, [miss, hit], today), true)
  assert.equal(matchesSubscription(baseAid, [], today), false)
})

test('treats selected categories as OR', () => {
  const either = persona({ categoryIds: ['category:貸款', 'category:托育服務'] })
  assert.equal(matchesSubscription(baseAid, [either], today), true)
  assert.equal(matchesSubscription({ ...baseAid, classification: '法律服務' }, [either], today), false)
})

test('treats selected tags as OR', () => {
  const either = persona({ tagIds: ['registration_months:4', 'registration_months:6'] })
  assert.equal(matchesSubscription({ ...baseAid, registrationMonths: 6 }, [either], today), true)
  assert.equal(matchesSubscription({ ...baseAid, registrationMonths: 24 }, [either], today), false)
  assert.equal(matchesSubscription({ ...baseAid, registrationMonths: null }, [either], today), false)
})

test('requires the single identity', () => {
  assert.equal(matchesSubscription({ ...baseAid, isOrganization: true }, [persona()], today), false)
  assert.equal(
    matchesSubscription({ ...baseAid, isOrganization: true }, [persona({ identity: 'is_organization:true' })], today),
    true,
  )
})

test('treats a blank birth date, identity, category, or tag as match-all', () => {
  const blank = persona({ birthDate: '', identity: '', categoryIds: [], tagIds: [] })
  const bounded = { ...baseAid, isOrganization: true, classification: '法律服務', registrationMonths: 24, ageLower: 40 }
  assert.equal(matchesSubscription(bounded, [blank], today), true)
  assert.equal(matchesSubscription({ ...baseAid, ageLower: 40 }, [persona({ birthDate: '' })], today), true)
  assert.equal(matchesSubscription({ ...baseAid, isOrganization: true }, [persona({ identity: '' })], today), true)
  assert.equal(matchesSubscription({ ...baseAid, classification: '法律服務' }, [persona({ categoryIds: [] })], today), true)
  assert.equal(matchesSubscription({ ...baseAid, registrationMonths: 24 }, [persona({ tagIds: [] })], today), true)
})

test('rejects an invalid or future birth date when one is filled in', () => {
  assert.equal(matchesSubscription(baseAid, [persona({ birthDate: '1996-02-31' })], today), false)
  assert.equal(matchesSubscription(baseAid, [persona({ birthDate: '2027-01-01' })], today), false)
})

test('requires every filled field together', () => {
  const strict = persona({
    categoryIds: ['category:托育服務'],
    tagIds: ['registration_months:4'],
  })
  assert.equal(matchesSubscription({ ...baseAid, registrationMonths: 4 }, [strict], today), true)
  assert.equal(matchesSubscription({ ...baseAid, registrationMonths: 6 }, [strict], today), false)
  assert.equal(matchesSubscription({ ...baseAid, isOrganization: true, registrationMonths: 4 }, [strict], today), false)
})

test('keeps one notification for a repeated source url or title', () => {
  const items = [
    { url: 'https://example.test/a', title: '甲' },
    { url: 'https://example.test/a', title: '乙' },
    { url: 'https://example.test/b', title: '甲' },
    { url: 'https://example.test/c', title: '丙' },
  ]
  assert.deepEqual(uniqueNotifications(items), [
    { url: 'https://example.test/a', title: '甲' },
    { url: 'https://example.test/c', title: '丙' },
  ])
})

test('detects duplicate persona criteria ignoring id and tag order', () => {
  const existing = persona({ categoryIds: ['category:托育服務', 'category:貸款'], tagIds: ['registration_months:6'] })
  assert.equal(
    personaCriteriaEqual(existing, {
      birthDate: existing.birthDate,
      identity: existing.identity,
      categoryIds: ['category:貸款', 'category:托育服務'],
      tagIds: ['registration_months:6'],
    }),
    true,
  )
  assert.equal(
    hasDuplicatePersona(
      [existing],
      {
        birthDate: existing.birthDate,
        identity: existing.identity,
        categoryIds: ['category:貸款', 'category:托育服務'],
        tagIds: ['registration_months:6'],
      },
    ),
    true,
  )
  assert.equal(
    hasDuplicatePersona([existing], {
      birthDate: existing.birthDate,
      identity: existing.identity,
      categoryIds: existing.categoryIds,
      tagIds: ['registration_months:4'],
    }),
    false,
  )
})

test('keeps the computed age inside the aid bounds', () => {
  assert.equal(matchesSubscription({ ...baseAid, ageLower: 40 }, [persona()], today), false)
  assert.equal(matchesSubscription({ ...baseAid, ageUpper: 18 }, [persona()], today), false)
  assert.equal(matchesSubscription({ ...baseAid, ageLower: 18, ageUpper: 40 }, [persona()], today), true)
  assert.equal(
    matchesSubscription({ ...baseAid, ageLower: 30 }, [persona({ birthDate: '1996-12-01' })], today),
    false,
  )
})
