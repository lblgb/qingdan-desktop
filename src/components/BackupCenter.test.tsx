// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatTaskDate } from '../lib/date'

const mockCreateBackup = vi.hoisted(() => vi.fn())
const mockRestoreBackup = vi.hoisted(() => vi.fn())

vi.mock('../stores/taskStore', () => ({
  useTaskStore: (selector: (state: { createBackup: typeof mockCreateBackup; restoreBackup: typeof mockRestoreBackup }) => unknown) =>
    selector({
      createBackup: mockCreateBackup,
      restoreBackup: mockRestoreBackup,
    }),
}))

import { BackupCenter } from './BackupCenter'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('BackupCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateBackup.mockResolvedValue(true)
    mockRestoreBackup.mockResolvedValue(true)
  })

  it('opens from the standalone entry button', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const onOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <BackupCenter
          isOpen={false}
          lastBackupAt={null}
          onBackupNow={vi.fn()}
          onExportCsv={vi.fn()}
          onExportJson={vi.fn()}
          onOpenChange={onOpenChange}
          onRestoreFromBackup={vi.fn()}
        />,
      )
    })

    container.querySelector('button[aria-haspopup="dialog"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onOpenChange).toHaveBeenCalledWith(true)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('shows the formatted last backup timestamp when available', () => {
    const formatted = formatTaskDate('2026-04-25T10:30:00.000Z', 'YYYY-MM-DD HH:mm')
    const markup = renderToStaticMarkup(
      <BackupCenter
        isOpen
        lastBackupAt="2026-04-25T10:30:00.000Z"
        onBackupNow={vi.fn()}
        onExportCsv={vi.fn()}
        onExportJson={vi.fn()}
        onOpenChange={vi.fn()}
        onRestoreFromBackup={vi.fn()}
      />,
    )

    expect(markup).toContain(formatted)
  })

  it('shows the empty state when no backup has been recorded', () => {
    const markup = renderToStaticMarkup(
      <BackupCenter
        isOpen
        lastBackupAt={null}
        onBackupNow={vi.fn()}
        onExportCsv={vi.fn()}
        onExportJson={vi.fn()}
        onOpenChange={vi.fn()}
        onRestoreFromBackup={vi.fn()}
      />,
    )

    expect(markup).toContain('灏氭棤澶囦唤璁板綍')
  })

  it('runs backup action after collecting a backup path', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('C:\\backup\\qingdan.db')
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <BackupCenter
          isOpen
          lastBackupAt={null}
          onBackupNow={vi.fn()}
          onExportCsv={vi.fn()}
          onExportJson={vi.fn()}
          onOpenChange={vi.fn()}
          onRestoreFromBackup={vi.fn()}
        />,
      )
    })

    const buttons = Array.from(container.querySelectorAll('.backup-center-action'))
    await act(async () => {
      buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(promptSpy).toHaveBeenCalled()
    expect(mockCreateBackup).toHaveBeenCalledWith('C:\\backup\\qingdan.db')

    await act(async () => {
      root.unmount()
    })
    promptSpy.mockRestore()
    container.remove()
  })

  it('asks for restore confirmation and triggers restore action', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('C:\\backup\\qingdan.db')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onOpenChange = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <BackupCenter
          isOpen
          lastBackupAt={null}
          onBackupNow={vi.fn()}
          onExportCsv={vi.fn()}
          onExportJson={vi.fn()}
          onOpenChange={onOpenChange}
          onRestoreFromBackup={vi.fn()}
        />,
      )
    })

    const buttons = Array.from(container.querySelectorAll('.backup-center-action'))
    await act(async () => {
      buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(promptSpy).toHaveBeenCalled()
    expect(confirmSpy).toHaveBeenCalled()
    expect(mockRestoreBackup).toHaveBeenCalledWith('C:\\backup\\qingdan.db')
    expect(onOpenChange).toHaveBeenCalledWith(false)

    await act(async () => {
      root.unmount()
    })
    promptSpy.mockRestore()
    confirmSpy.mockRestore()
    container.remove()
  })

  it('keeps export actions disabled in the current phase', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <BackupCenter
          isOpen
          lastBackupAt={null}
          onBackupNow={vi.fn()}
          onExportCsv={vi.fn()}
          onExportJson={vi.fn()}
          onOpenChange={vi.fn()}
          onRestoreFromBackup={vi.fn()}
        />,
      )
    })

    const actionButtons = Array.from(container.querySelectorAll('.backup-center-action')) as HTMLButtonElement[]

    expect(actionButtons).toHaveLength(4)
    expect(actionButtons[0]?.disabled).toBe(false)
    expect(actionButtons[1]?.disabled).toBe(false)
    expect(actionButtons[2]?.disabled).toBe(true)
    expect(actionButtons[3]?.disabled).toBe(true)

    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('closes the panel from the close button', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const onOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <BackupCenter
          isOpen
          lastBackupAt={null}
          onBackupNow={vi.fn()}
          onExportCsv={vi.fn()}
          onExportJson={vi.fn()}
          onOpenChange={onOpenChange}
          onRestoreFromBackup={vi.fn()}
        />,
      )
    })

    container.querySelector('.modal-close-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onOpenChange).toHaveBeenCalledWith(false)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
