// Conditional ipcMain registration for the fork's capability gates.
//
// A capability is only genuinely absent when no ipcMain handler is registered
// for its channel — a renderer-side or preload-side check is cosmetic, because
// the channel stays invocable. So the gate belongs at registration, and these
// helpers keep that a one-line change at each call site instead of an `if`
// block wrapped around a 50-line handler body.
//
// With the capability off the channel is never registered, and an invoke from
// the renderer rejects with Electron's own "No handler registered" error.
import { ipcMain } from 'electron'

import { type Capability, capabilityEnabled } from './feature-flags'

type InvokeListener = Parameters<typeof ipcMain.handle>[1]
type SendListener = Parameters<typeof ipcMain.on>[1]

export function handleWhenEnabled(capability: Capability, channel: string, listener: InvokeListener): void {
  if (capabilityEnabled(capability)) {
    ipcMain.handle(channel, listener)
  }
}

export function onWhenEnabled(capability: Capability, channel: string, listener: SendListener): void {
  if (capabilityEnabled(capability)) {
    ipcMain.on(channel, listener)
  }
}
