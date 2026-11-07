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
      data: { title: '新的符合補助', content: title },
    }),
  )
}
