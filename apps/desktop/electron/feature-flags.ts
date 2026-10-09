const featureFlags = {
  /** Local-models GUI surfaces (settings pane, pickers, statusbar, tips). */
  localModels: ({ argv }) =>
    process.platform === 'win32' ||
    process.platform === 'darwin' ||
    (process.platform === 'linux' && (process.arch === 'x64' || process.arch === 'arm64')) ||
    argv.includes('--local')
} satisfies Record<string, (args: FeatureFlagInput) => boolean>

export type FeatureFlags = { [K in keyof typeof featureFlags]: boolean }

// Company Brain fork: capability subtraction. Each entry gates an upstream
// capability this fork removes, and every one of them defaults OFF. The argv
// escape hatch exists so a capability can be switched back on to compare
// behaviour against upstream while bisecting a regression — never for shipping.
//
// Deliberately NOT part of `featureFlags` above: that registry is the product
// flag payload handed to the renderer, keyed by what a surface should offer.
// These are security boundaries, resolved in the main process at module scope
// (several gates run before `app.whenReady`), and a capability must stay off
// even if the renderer payload fails to arrive.
const capabilityArgv = {
  fileRead: '--enable-file-read',
  fsWrite: '--enable-fs-write',
  git: '--enable-git',
  runtimePlugins: '--enable-runtime-plugins',
  terminal: '--enable-terminal',
  toolPanes: '--enable-tool-panes'
} as const

export type Capability = keyof typeof capabilityArgv

export function capabilityEnabled(name: Capability, argv: readonly string[] = process.argv): boolean {
  return argv.includes(capabilityArgv[name])
}

/** The capability posture, for the renderer payload and for diagnostics. */
export function resolveCapabilities(argv: readonly string[] = process.argv): Record<Capability, boolean> {
  return Object.fromEntries(
    Object.keys(capabilityArgv).map(name => [name, capabilityEnabled(name as Capability, argv)])
  ) as Record<Capability, boolean>
}

export function isCanaryTag(tag: string | null | undefined): boolean {
  return /\+canary\.20\d{6}T\d{6}Z$/.test(tag || '')
}

export interface FeatureFlagInput {
  /** desktop launch flags */
  argv: readonly string[]
  /** Whether this artifact is a canary-channel build. */
  canary: boolean
}

export function resolveFeatureFlags(input: FeatureFlagInput): FeatureFlags {
  return Object.fromEntries(Object.entries(featureFlags).map(([k, v]) => [k, v(input)])) as FeatureFlags
}
