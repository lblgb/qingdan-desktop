// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecurringTaskList } from './RecurringTaskList'
import { useRecurringStore } from '../stores/recurringStore'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('RecurringTaskList', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    useRecurringStore.setState({
      tasks: [
        {
          id: 'recurring-1',
          title: '每周项目进展',
          description: '写本周推进情况',
          cadenceUnit: 'week',
          cadenceInterval: 1,
          targetMinutesPerPeriod: 420,
          remindAtEnd: true,
          isActive: true,
          createdAt: '2026-05-01T08:00:00.000Z',
          updatedAt: '2026-05-01T08:00:00.000Z',
        },
      ],
      periodsByTaskId: {
        'recurring-1': [
          {
            id: 'period-1',
            taskId: 'recurring-1',
            startAt: '2026-05-01T08:00:00.000Z',
            endAt: '2026-05-08T08:00:00.000Z',
            closedAt: null,
            createdAt: '2026-05-01T08:00:00.000Z',
            updatedAt: '2026-05-01T08:00:00.000Z',
          },
        ],
      },
      timeEntriesByPeriodId: {},
      selectedTaskId: 'recurring-1',
      selectedPeriodId: 'period-1',
      isLoading: false,
      isMutating: false,
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  it('opens a timer modal from a recurring task row', async () => {
    await act(async () => {
      root.render(<RecurringTaskList />)
    })

    const startButton = container.querySelector<HTMLButtonElement>('[data-testid="start-recurring-timer"]')
    expect(startButton).toBeTruthy()

    await act(async () => {
      startButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('.recurring-timer-modal')?.textContent).toContain('周期任务计时')
  })

  it('offers timer first, then detail, edit, and delete actions for recurring task rows', async () => {
    const removeTask = vi.fn().mockResolvedValue(undefined)
    useRecurringStore.setState({ removeTask })

    await act(async () => {
      root.render(<RecurringTaskList />)
    })

    const buttons = Array.from(container.querySelectorAll('button')).map((button) => button.textContent)
    expect(buttons.slice(0, 4)).toEqual(['开始计时', '详情', '编辑', '删除'])

    const detailButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '详情')
    await act(async () => {
      detailButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#recurring-detail-title')?.textContent).toBe('每周项目进展')

    const editButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '编辑')
    await act(async () => {
      editButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('#recurring-edit-title')?.textContent).toBe('编辑周期任务')

    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '删除')
    await act(async () => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(removeTask).toHaveBeenCalledWith('recurring-1')
  })

  it('shows target, completed, and remaining minutes for recurring tasks', async () => {
    useRecurringStore.setState({
      timeEntriesByPeriodId: {
        'period-1': [
          {
            id: 'time-1',
            periodId: 'period-1',
            startedAt: '2026-05-06T08:00:00.000Z',
            endedAt: '2026-05-06T09:30:00.000Z',
            durationMinutes: 90,
            note: 'wrote tests',
            createdAt: '2026-05-06T09:30:00.000Z',
            updatedAt: '2026-05-06T09:30:00.000Z',
          },
        ],
      },
    })

    await act(async () => {
      root.render(<RecurringTaskList />)
    })

    expect(container.textContent).toContain('90 / 420')
    expect(container.textContent).toContain('还差 5 小时 30 分钟')
    expect(container.textContent).toContain('wrote tests')
  })

  it('keeps the list compact and shows full history only in detail', async () => {
    useRecurringStore.setState({
      selectTask: vi.fn().mockResolvedValue(undefined),
      selectPeriod: vi.fn().mockResolvedValue(undefined),
      timeEntriesByPeriodId: {
        'period-1': [
          {
            id: 'time-1',
            periodId: 'period-1',
            startedAt: '2026-05-02T08:00:00.000Z',
            endedAt: '2026-05-02T09:00:00.000Z',
            durationMinutes: 60,
            note: '完成接口联调',
            createdAt: '2026-05-02T09:00:00.000Z',
            updatedAt: '2026-05-02T09:00:00.000Z',
          },
          {
            id: 'time-2',
            periodId: 'period-1',
            startedAt: '2026-05-03T08:00:00.000Z',
            endedAt: '2026-05-03T09:00:00.000Z',
            durationMinutes: 60,
            note: '补了回归测试',
            createdAt: '2026-05-03T09:00:00.000Z',
            updatedAt: '2026-05-03T09:00:00.000Z',
          },
        ],
      },
    })

    await act(async () => {
      root.render(<RecurringTaskList />)
    })

    expect(container.querySelector('.recurring-entry-list')).toBeNull()
    expect(container.querySelector('.recurring-latest-entry')?.textContent).toContain('补了回归测试')

    const detailButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '详情')
    await act(async () => {
      detailButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('.recurring-history-timeline')).toBeTruthy()
    expect(container.querySelectorAll('.recurring-entry-list li')).toHaveLength(2)
  })
})
