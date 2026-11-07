interface FlutterMessageEvent {
  data?: unknown
}

interface FlutterObject {
  postMessage: (message: string) => void
  addEventListener?: (type: string, listener: (event: FlutterMessageEvent) => void) => void
  removeEventListener?: (type: string, listener: (event: FlutterMessageEvent) => void) => void
}

export interface TownPassUserInfo {
  birthday?: string
  nativePeople?: boolean
}

function flutterObject(): FlutterObject | null {
  const host = globalThis as typeof globalThis & { flutterObject?: FlutterObject }
  return host.flutterObject ?? null
}

function parseBridgePayload(data: unknown): { name?: string; data?: unknown } | null {
  const value =
    typeof data === 'string'
      ? (() => {
          try {
            return JSON.parse(data) as unknown
          } catch {
            return null
          }
        })()
      : data
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as { name?: string; data?: unknown }
}

export function requestUserInfo(): Promise<TownPassUserInfo | null> {
  const bridge = flutterObject()
  if (!bridge) return Promise.resolve(null)
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: TownPassUserInfo | null) => {
      if (settled) return
      settled = true
      globalThis.clearTimeout(timer)
      bridge.removeEventListener?.('message', onMessage)
      resolve(value)
    }
    const onMessage = (event: FlutterMessageEvent) => {
      const payload = parseBridgePayload(event.data)
      if (!payload || payload.name !== 'userinfo') return
      const data = payload.data
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        finish(null)
        return
      }
      const record = data as { birthday?: unknown; nativePeople?: unknown }
      finish({
        birthday: typeof record.birthday === 'string' ? record.birthday : undefined,
        nativePeople: typeof record.nativePeople === 'boolean' ? record.nativePeople : undefined,
      })
    }
    const timer = globalThis.setTimeout(() => finish(null), 8000)
    bridge.addEventListener?.('message', onMessage)
    try {
      bridge.postMessage(JSON.stringify({ name: 'userinfo', data: null }))
    } catch {
      finish(null)
    }
  })
}

export function notifyMatchingAid(title: string): void {
  const bridge = flutterObject()
  if (!bridge) return
  bridge.postMessage(
    JSON.stringify({
      name: 'notify',
      data: { title: '符合您訂閱條件的政府補助', content: title },
    }),
  )
}
