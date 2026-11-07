interface FlutterObject {
  postMessage: (message: string) => void
}

function flutterObject(): FlutterObject | null {
  const host = window as Window & { flutterObject?: FlutterObject }
  return host.flutterObject ?? null
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
