import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Tauri capabilities', () => {
  it('grants notification plugin permissions to the main window', () => {
    const capabilityPath = resolve(process.cwd(), 'src-tauri/capabilities/default.json')
    const capability = JSON.parse(readFileSync(capabilityPath, 'utf8')) as {
      windows?: string[]
      permissions?: string[]
    }

    expect(capability.windows).toContain('main')
    expect(capability.permissions).toContain('notification:default')
  })
})
