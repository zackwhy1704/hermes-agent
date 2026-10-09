# Fork provenance

This repository is a fork of Hermes Desktop, maintained to ship the Company
Brain desktop client.

| | |
|---|---|
| Upstream remote | `https://github.com/NousResearch/hermes-agent.git` |
| Upstream branch | `main` |
| Forked-from SHA | `73162b00eefde3794bed0afb53d84a19c0eed230` |
| Upstream commit date | 2026-10-09T09:49:44Z |
| Fork created | 2026-10-09 |
| Fork remote | `https://github.com/zackwhy1704/hermes-agent.git` |
| Work branch | `int3/fork` |
| Upstream licence | MIT (`LICENSE`, repo root) — no carve-out |

Clone was taken at full depth: 50,996 commits (`git rev-list --count HEAD`).
`git rev-parse --is-shallow-repository` → `false`. Do not work from a shallow
clone of this repository; commit-count and history questions have twice been
answered wrongly from one.

## Why this is a fork and not a plugin

The Company Brain client ships as a bundled in-tree plugin at
`apps/desktop/src/plugins/company-brain/`, discovered by the vite glob in
`apps/desktop/src/contrib/plugins.ts`. It is a fork rather than a runtime
plugin because the runtime plugin loader requires three arbitrary-path file-read
IPC bridges (`desktopPluginsRoot`, `readDir`, and `readPluginSource` or
`readFileText`) that we remove. Loading our UI from disk would mean keeping an
unconfined file-read door open in the renderer; compiling it in does not.

## Divergence from upstream

Our changes are subtractive plus one added directory:

- One added directory, `apps/desktop/src/plugins/company-brain/` — no edit to
  any upstream file is needed for it to load.
- Two deleted lines in `apps/desktop/src/contrib/plugins.ts` (the
  `watchRuntimePlugins` import and its call) that would otherwise keep the
  runtime plugin loader, and its read bridges, alive.
- Capability subtraction gated behind flags in
  `apps/desktop/electron/feature-flags.ts`: terminal/PTY, git, filesystem
  write, and the arbitrary-path file-read doors.
- A Content-Security-Policy on the app renderer session, which upstream does
  not set.

## Keeping current with upstream

```sh
git fetch upstream
git log --oneline HEAD..upstream/main
```

Upstream moves fast: 103 commits landed in the few hours between an earlier
clone (`1744a19e0df568c647e4f3ff9c37f2a284a282fb`) and this fork point, touching
79 files. Re-verify line-number references after every merge.

Commit counts for the files our patch touches, measured at full depth with
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
