import assert from 'node:assert/strict'
import test from 'node:test'
import { matchesSubscription, type MatchableAid, type SubscriptionCriteria } from '../src/services/matchSubscription.ts'

const baseAid: MatchableAid = {
  classification: '托育服務',
  isOrganization: false,
  registrationMonths: null,
  ageLower: null,
  ageUpper: null,
  isNative: null,
}

const person: SubscriptionCriteria = {
  age: 30,
  categories: [],
  isNative: false,
  isOrganization: false,
  registrationMonths: 12,
}

test('matches when optional age and indigenous fields are absent', () => {
  assert.equal(matchesSubscription(baseAid, person), true)
})

test('requires a selected category when the user picked any', () => {
  assert.equal(matchesSubscription(baseAid, { ...person, categories: ['貸款'] }), false)
  assert.equal(matchesSubscription(baseAid, { ...person, categories: ['托育服務'] }), true)
})

test('requires the same organization flag', () => {
  assert.equal(matchesSubscription({ ...baseAid, isOrganization: true }, person), false)
  assert.equal(
    matchesSubscription({ ...baseAid, isOrganization: true }, { ...person, isOrganization: true }),
    true,
  )
})

test('requires enough months of residency only when the aid sets a minimum', () => {
  assert.equal(matchesSubscription({ ...baseAid, registrationMonths: 24 }, person), false)
  assert.equal(
    matchesSubscription({ ...baseAid, registrationMonths: 6 }, person),
    true,
  )
  assert.equal(matchesSubscription({ ...baseAid, registrationMonths: null }, { ...person, registrationMonths: 0 }), true)
})

test('keeps the user inside the age bounds when they exist', () => {
  assert.equal(matchesSubscription({ ...baseAid, ageLower: 40 }, person), false)
  assert.equal(matchesSubscription({ ...baseAid, ageUpper: 18 }, person), false)
  assert.equal(matchesSubscription({ ...baseAid, ageLower: 18, ageUpper: 40 }, person), true)
})

test('requires indigenous identity only when the aid sets is_native', () => {
  assert.equal(matchesSubscription({ ...baseAid, isNative: true }, person), false)
  assert.equal(matchesSubscription({ ...baseAid, isNative: true }, { ...person, isNative: true }), true)
  assert.equal(matchesSubscription({ ...baseAid, isNative: false }, person), true)
})
