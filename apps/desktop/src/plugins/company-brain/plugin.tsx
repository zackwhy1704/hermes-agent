/**
 * Company Brain — the product surface, compiled into the fork rather than
 * loaded from disk.
 *
 * This file is the whole seam: the vite glob in `../../contrib/plugins.ts`
 * discovers `src/plugins/<name>/plugin.tsx` and registers whatever it
 * default-exports, so nothing upstream has to be edited to mount it. Loading
 * the same UI through the runtime plugin door instead would require the
 * `desktopPluginsRoot`, `readDir` and `readPluginSource`/`readFileText` IPC
 * bridges, all of which read any path the renderer asks for — this fork
 * removes them, so the UI ships in-tree.
 *
 * Seam test only at this stage: static text, no gateway calls.
 */

import { type HermesPlugin } from '@hermes/plugin-sdk'

const plugin: HermesPlugin = {
  id: 'company-brain',
  name: 'Company Brain',
  description: 'Ask questions against your organisation’s knowledge base.',
  register(ctx) {
    ctx.register({
      id: 'pane',
      area: 'panes',
      title: 'Company Brain',
      data: { placement: 'main' },
      render: () => (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
          <div className="text-sm font-medium">Company Brain</div>
          <div className="text-xs text-(--ui-text-tertiary)">
            Bundled plugin seam is live. Gateway wiring not connected yet.
          </div>
        </div>
      )
    })
  }
}

export default plugin
