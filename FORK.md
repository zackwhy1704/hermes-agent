# Capability-reduction reference (audit artifact — NOT the product path)

This branch (`int3/fork`) is a **reference and audit artifact**, not the shipping
architecture for the Company Brain desktop client. It is kept because it is the
only place where the question "how much of Hermes Desktop's local capability
surface can actually be removed, and what breaks?" has been answered with
measurements rather than argument.

**Do not build the product on this branch.** It solves the wrong problem.

## Why it was abandoned

The subtraction patch here removes local capabilities — the PTY host, git IPC,
the filesystem write surface, and the arbitrary-path file-read doors — on the
assumption that the client's requirement was *fewer capabilities*.

That assumption was wrong. The requirement is a **sandboxed environment**: the
client wants the terminal, file browser and git panes, pointed at a container we
run rather than at their own laptop. The capabilities were never the problem.
Their *target* was. Reducing the surface and relocating the surface are different
solutions, and only the second one meets the requirement.

The architecture being evaluated instead is stock Hermes Desktop as a thin client
against a per-tenant containerised backend, with the brain reached server-side
over MCP. Zero fork.

## What is still worth reading here

Each commit is independently revertable and carries its measurements in the
message. The findings that outlived the approach:

- **A capability is removed only when its `ipcMain` handler is not registered AND
  its preload bridge entry is absent.** A pane deletion is cosmetic — the channel
  stays invocable. This rule is why `2f` (pane chrome) comes *after* `2a`–`2c`
  (the doors those panes drive).
- **`registerTerminalIpc` cannot be gated at its registration.** `main.ts`
  consumes the returned API at module scope and dereferences
  `.disposeTerminalSession` immediately, calling the scope/all disposers without
  optional chaining. Returning `undefined` crashes the app during module
  evaluation; a no-op stub implementing the full `TerminalIpcApi` is the only
  safe shape. See commit `2a`.
- **Disk plugin loading requires three arbitrary-path read bridges**
  (`desktopPluginsRoot`, `readDir`, and `readPluginSource`/`readFileText`). None
  of them confines the requested path to a root — the shared resolver expands
  `~`, accepts `file:` URLs and resolves anything else against cwd, guarded only
  by a sensitive-filename denylist and a size cap.
- **`readDir` cannot be removed.** It is the directory layer under
  `lib/desktop-fs.ts`, which 23 non-test modules import, including the chat
  composer's attachment flow, the project tree, the preview panes and gateway
  boot. It survives any subtraction as arbitrary-path directory enumeration
  (names and metadata, never contents). See commit `2e`.
- **Stopping the runtime plugin loader takes more than one call site.** Removing
  `watchRuntimePlugins()` leaves `discoverRuntimePlugins` reachable from a
  command-palette entry that triggers a full disk rescan. See commit `2e`.
- **Upstream sets no CSP on the app renderer.** `onHeadersReceived` appears
  nowhere in `electron/`; the only CSP strings are for the embedded player
  iframe and the local-preview sandbox. Measured: the header hook *does* fire for
  `file://` requests on Electron 40 (151 in one boot), so a policy added there
  reaches a packaged document. It also showed the renderer fetching a stylesheet
  from `fonts.googleapis.com` on every launch. See commit `Task 3`.
- **A bundled plugin needs no upstream edit to mount.** The vite glob in
  `src/contrib/plugins.ts` discovers `src/plugins/*/plugin.{js,ts,tsx}`, so our
  pane loaded with `git diff HEAD -- src/contrib/plugins.ts` empty. This remains
  true and is the delivery mechanism of choice *if* in-tree UI is ever needed.

### Test impact, measured

Both suites were run on this branch and again on upstream `main` on the same
Windows machine, and the failure sets diffed:

| | Electron | UI |
|---|---|---|
| Upstream `main` baseline | 42 failed / 3448 passed | 2 failed / 10723 passed |
| `int3/fork` | 50 failed / 3440 passed | 3 failed / 10712 passed |

**Exactly 9 new failures, all intended capability removals, zero regressions
elsewhere:** 6 in `fs-ipc.test.ts` (`logsRoot` ×3, `reveal` ×3, commit `2c`), 2 in
`terminal-pty-dispose.test.ts` (commit `2a`), 1 in
`sessions-pane-tab-title.test.tsx` (commit `2f`). The UI test total drops by 10
because `plugin-install-modal.test.tsx` was deleted with the modal it covers.

Upstream's own 42 electron failures on Windows are pre-existing and unrelated —
`updater/*`, `tray-host` (dbus-native), `ssh-connection`,
`linux-crash-diagnostics`, and seven `scripts/*.test.mjs` packaging tests.

## Provenance

| | |
|---|---|
| Upstream remote | `https://github.com/NousResearch/hermes-agent.git` |
| Upstream branch | `main` |
| Forked-from SHA | `73162b00eefde3794bed0afb53d84a19c0eed230` |
| Upstream commit date | 2026-10-09T09:49:44Z |
| Fork created | 2026-10-09 |
| Fork remote | `https://github.com/zackwhy1704/hermes-agent.git` |
| Branch | `int3/fork` |
| Upstream licence | MIT (`LICENSE`, repo root) — no carve-out |

Clone was taken at full depth: 50,996 commits (`git rev-list --count HEAD`).
`git rev-parse --is-shallow-repository` → `false`. Do not work from a shallow
clone of this repository; history questions have twice been answered wrongly
from one.

Upstream moves fast: 103 commits landed in the few hours between an earlier clone
(`1744a19e0df568c647e4f3ff9c37f2a284a282fb`) and this fork point, touching 79
files. Re-verify line-number references after any merge.

Commit counts for the files this patch touches, measured at full depth with
`git log --oneline --all -- <path> | wc -l`:

| File | Commits |
|---|---|
| `apps/desktop/electron/main.ts` | 1196 |
| `apps/desktop/src/sdk/index.ts` | 231 |
| `apps/desktop/electron/preload.ts` | 230 |
| `apps/desktop/src/app/contrib/controller.tsx` | 107 |
| `apps/desktop/src/contrib/runtime-loader.ts` | 34 |
| `apps/desktop/src/contrib/plugin.ts` | 18 |
| `apps/desktop/electron/feature-flags.ts` | 7 |
| `apps/desktop/src/contrib/types.ts` | 6 |
| `apps/desktop/src/contrib/plugins.ts` | 6 |

## If you resurrect this branch

The capability flags live in `apps/desktop/electron/feature-flags.ts`
(`capabilityEnabled`). All default OFF, each with an `--enable-*` argv escape
hatch for bisecting behaviour against upstream. The gates are applied through
`apps/desktop/electron/capability-ipc.ts`, which registers a channel only when
its capability is on.

Known loose end, never resolved: `openPluginInstallRequest` still has callers in
`capabilities/plugins/plugins-tab.tsx` (an "Install" button),
`store/plugin-catalog-install.ts` and `contrib/hooks/use-desktop-integrations.ts`.
They set an atom nothing consumes, so that button is inert rather than removed.
