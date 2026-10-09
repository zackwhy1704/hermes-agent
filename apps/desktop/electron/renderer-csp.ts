// Content-Security-Policy for the app renderer.
//
// Upstream sets no policy on the app window: `onHeadersReceived` appears
// nowhere in electron/, and the only CSP strings in the tree are for the
// embedded player iframe (embed-host.ts) and the local-preview sandbox
// (lib/local-preview.ts). So renderer code — including anything injected into
// it — can `fetch()` or open a WebSocket to any origin on the internet. With
// the file-read doors removed there is less to exfiltrate, but egress should
// not be open regardless.
//
// Scope is deliberately `connect-src` only. A full policy would also pin
// script-src/style-src/img-src, but those break rendering rather than egress,
// and mixing them in would make "what did the CSP break?" unanswerable. Pinning
// the rest is a follow-up.
import type { Session } from 'electron'

const LOOPBACK_PATTERNS = [
  'http://127.0.0.1:*',
  'http://localhost:*',
  'ws://127.0.0.1:*',
  'ws://localhost:*'
] as const

/**
 * The connect-src allowlist for a set of configured gateway base URLs.
 *
 * Loopback is allowed on any port because the local backend is spawned on an
 * ephemeral one, so its origin is not known when the policy is built. Each
 * remote gateway contributes both its http(s) origin and the matching ws(s)
 * origin, since the app opens gateway sockets alongside REST calls.
 *
 * Pure so the allowlist can be asserted without an Electron session.
 */
export function connectSrcOrigins(baseUrls: readonly (string | undefined)[] = []): string[] {
  const origins = new Set<string>(["'self'", ...LOOPBACK_PATTERNS])

  for (const raw of baseUrls) {
    const trimmed = String(raw ?? '').trim()

    if (!trimmed) {
      continue
    }

    try {
      const { protocol, host } = new URL(trimmed)

      if (protocol !== 'http:' && protocol !== 'https:') {
        continue
      }

      origins.add(`${protocol}//${host}`)
      origins.add(`${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}`)
    } catch {
      // Not a parseable URL (a half-typed Settings field) — contributes nothing.
    }
  }

  return [...origins]
}

export function buildConnectSrcPolicy(baseUrls: readonly (string | undefined)[] = []): string {
  return `connect-src ${connectSrcOrigins(baseUrls).join(' ')}`
}

/**
 * Attach the policy to a session's HTTP responses.
 *
 * Returns the set of request URLs the hook actually saw, which is the only
 * honest way to know whether the policy reaches the app document: a packaged
 * build loads the renderer over `file://`, and Electron's file loader does not
 * run responses through webRequest. `onReport` receives each URL once.
 */
export function installRendererCsp(
  target: Pick<Session, 'webRequest'>,
  resolveBaseUrls: () => readonly (string | undefined)[],
  onReport?: (url: string) => void
): void {
  target.webRequest.onHeadersReceived((details, callback) => {
    onReport?.(details.url)

    // Only documents carry a useful policy; subresource responses inherit the
    // document's. Replacing an existing CSP header would also be wrong here —
    // the preview sandbox sets its own, stricter one.
    if (details.resourceType !== 'mainFrame' && details.resourceType !== 'subFrame') {
      callback({})

      return
    }

    const headers = { ...details.responseHeaders }

    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === 'content-security-policy') {
        callback({})

        return
      }
    }

    headers['Content-Security-Policy'] = [buildConnectSrcPolicy(resolveBaseUrls())]
    callback({ responseHeaders: headers })
  })
}
