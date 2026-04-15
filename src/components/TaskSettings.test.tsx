import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_REMINDER_PREFERENCES } from '../features/tasks/task.reminders'
import { TaskSettings } from './TaskSettings'

describe('TaskSettings', () => {
  it('renders reminder preference fields when dialog is open', () => {
    const markup = renderToStaticMarkup(
      <TaskSettings
        isOpen
        isSaving={false}
        preferences={DEFAULT_REMINDER_PREFERENCES}
        onOpenChange={vi.fn()}
        onPreferencesChange={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(markup).toContain('提醒设置')
    expect(markup).toContain('应用内提醒')
    expect(markup).toContain('桌面系统通知')
    expect(markup).toContain('高及以上')
  })
})
