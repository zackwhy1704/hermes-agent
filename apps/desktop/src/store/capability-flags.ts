/**
 * Renderer view of this fork's capability posture.
 *
 * Mirrors the `$localModelsEnabled` idiom: a launch-flag fact read once from
 * the preload bridge, static for the window's lifetime.
 *
 * Advisory only. A capability is absent because its ipcMain handler was never
 * registered; this flag exists so the UI does not register chrome that drives a
 * door which is no longer there. Never treat a false here as the boundary —
 * the boundary is in the main process.
 */
export function capabilityOn(name: string): boolean {
  return typeof window !== 'undefined' && window.hermesDesktop?.capabilities?.[name] === true
}
