import assert from 'node:assert/strict'
import test from 'node:test'
import { requestUserInfo } from '../src/services/townpass.js'
import { ageFromTownPassBirthday, applyUserInfoFilters } from '../src/services/userinfo.js'

const today = new Date(2026, 10, 8)

test('TownPass birthday uses full years and yyyy/MM/dd', () => {
  assert.equal(ageFromTownPassBirthday('1988/12/12', today), 37)
  assert.equal(ageFromTownPassBirthday('1988/12/12', new Date(2026, 11, 12)), 38)
  assert.equal(ageFromTownPassBirthday('1988/02/31', today), null)
})

test('userinfo selects indigenous only when nativePeople is true and sets age', () => {
  assert.deepEqual(
    applyUserInfoFilters(['category:托育服務', 'age:20'], { birthday: '1988/12/12', nativePeople: true }, today),
    ['category:托育服務', 'label:indigenous', 'age:37'],
  )
  assert.deepEqual(
    applyUserInfoFilters(['label:indigenous'], { birthday: '1988/12/12', nativePeople: false }, today),
    ['label:indigenous', 'age:37'],
  )
  assert.deepEqual(applyUserInfoFilters(['age:20'], { nativePeople: false }, today), ['age:20'])
})

test('requestUserInfo posts a string and keeps only birthday and nativePeople', async () => {
  const posted: string[] = []
  const listeners: Array<(event: { data?: unknown }) => void> = []
  const host = globalThis as typeof globalThis & {
    flutterObject?: {
      postMessage: (message: string) => void
      addEventListener: (type: string, listener: (event: { data?: unknown }) => void) => void
      removeEventListener: (type: string, listener: (event: { data?: unknown }) => void) => void
    }
  }
  host.flutterObject = {
    postMessage(message: string) {
      posted.push(message)
    },
    addEventListener(_type: string, listener: (event: { data?: unknown }) => void) {
      listeners.push(listener)
    },
    removeEventListener(_type: string, listener: (event: { data?: unknown }) => void) {
      const index = listeners.indexOf(listener)
      if (index >= 0) listeners.splice(index, 1)
    },
  }
  try {
    const pending = requestUserInfo()
    assert.equal(posted.length, 1)
    assert.deepEqual(JSON.parse(posted[0]!), { name: 'userinfo', data: null })
    listeners[0]!({
      data: JSON.stringify({
        name: 'userinfo',
        data: {
          id: '7f3562f4-bb3f-4ec7-89b9-da3b4b5ff250',
          realName: '金大森',
          birthday: '1988/12/12',
          nativePeople: false,
          email: 'ist83903@bcaoo.com',
        },
      }),
    })
    assert.deepEqual(await pending, { birthday: '1988/12/12', nativePeople: false })
    assert.equal(listeners.length, 0)
  } finally {
    delete host.flutterObject
  }
})
