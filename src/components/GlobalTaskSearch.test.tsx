// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalTaskSearch } from './GlobalTaskSearch'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('GlobalTaskSearch', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('renders results and forwards selection', async () => {
    const onSelect = vi.fn()

    await act(async () => {
      root.render(
        <GlobalTaskSearch
          keyword="恢复"
          results={[
            {
              task: {
                id: 'task-1',
                title: '备份中心',
                description: '',
                note: '恢复入口',
                completed: false,
                completedAt: null,
                archivedAt: null,
                groupId: null,
                dueAt: null,
                priority: 'medium',
                createdAt: '2026-04-26T08:00:00.000Z',
                updatedAt: '2026-04-26T08:00:00.000Z',
              },
              matchedField: 'note',
            },
          ]}
          onKeywordChange={vi.fn()}
          onSelect={onSelect}
        />,
      )
    })

    const input = container.querySelector('input[aria-label="搜索任务"]') as HTMLInputElement
    expect(input).toBeTruthy()

    const resultButton = container.querySelector('.global-task-search-result')
    expect(resultButton?.textContent).toContain('备份中心')

    await act(async () => {
      resultButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onSelect).toHaveBeenCalledWith('task-1')
  })
})
