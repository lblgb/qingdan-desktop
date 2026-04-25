// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BackupCenter } from './BackupCenter'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('BackupCenter', () => {
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

    container.querySelector('button[aria-label="备份与恢复"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onOpenChange).toHaveBeenCalledWith(true)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('shows the last backup timestamp when available', () => {
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

    expect(markup).toContain('最近备份')
    expect(markup).toContain('最近一次本地备份时间：2026-04-25 18:30')
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

    expect(markup).toContain('尚无备份记录')
  })

  it('renders all backup and export entry actions in the panel', () => {
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

    const actionButtons = Array.from(container.querySelectorAll('.backup-center-action'))

    expect(actionButtons).toHaveLength(4)
    expect(actionButtons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true)
    expect(container.textContent).toContain('立即备份')
    expect(container.textContent).toContain('从备份恢复')
    expect(container.textContent).toContain('导出 JSON')
    expect(container.textContent).toContain('导出 CSV')

    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('keeps backup actions in placeholder state during the frontend-only phase', () => {
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

    expect(markup.match(/当前仅展示入口，不执行真实命令/g)?.length).toBe(4)
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
