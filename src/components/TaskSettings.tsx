import type { ReminderOffsetPreset, ReminderPreferences, ReminderPriorityThreshold } from '../features/tasks/task.types'

const THRESHOLD_OPTIONS: Array<{ value: ReminderPriorityThreshold; label: string }> = [
  { value: 'urgent', label: '紧急及以上' },
  { value: 'high', label: '高及以上' },
  { value: 'medium', label: '中及以上' },
]

const OFFSET_OPTIONS: Array<{ value: ReminderOffsetPreset; label: string }> = [
  { value: 'at-time', label: '准时' },
  { value: '10-minutes', label: '提前 10 分钟' },
  { value: '1-hour', label: '提前 1 小时' },
  { value: '1-day', label: '提前 1 天' },
  { value: 'custom', label: '自定义时间' },
]

interface TaskSettingsProps {
  isOpen: boolean
  isSaving: boolean
  preferences: ReminderPreferences
  onOpenChange: (isOpen: boolean) => void
  onPreferencesChange: (preferences: ReminderPreferences) => void
  onSave: () => void | Promise<void>
}

export function TaskSettings({
  isOpen,
  isSaving,
  preferences,
  onOpenChange,
  onPreferencesChange,
  onSave,
}: TaskSettingsProps) {
  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="icon-button"
        onClick={() => onOpenChange(true)}
        type="button"
      >
        <span aria-hidden="true" className="icon-button-glyph">
          设
        </span>
        <span>设置</span>
      </button>

      {isOpen ? (
        <div className="modal-backdrop" onClick={() => onOpenChange(false)} role="presentation">
          <section
            aria-labelledby="task-settings-title"
            aria-modal="true"
            className="task-modal task-modal-compact"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-modal-header">
              <div>
                <p className="section-tag">提醒偏好</p>
                <h2 id="task-settings-title">提醒设置</h2>
              </div>
              <button className="secondary-button modal-close-button" onClick={() => onOpenChange(false)} type="button">
                关闭
              </button>
            </div>

            <form
              className="task-settings-form"
              onSubmit={(event) => {
                event.preventDefault()
                void onSave()
              }}
            >
              <label className="task-settings-toggle">
                <input
                  checked={preferences.enableInApp}
                  onChange={(event) =>
                    onPreferencesChange({
                      ...preferences,
                      enableInApp: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                <div>
                  <strong>应用内提醒</strong>
                  <span>控制关注条和提醒中心是否展示实际提醒内容。</span>
                </div>
              </label>

              <label className="task-settings-toggle">
                <input
                  checked={preferences.enableDesktop}
                  onChange={(event) =>
                    onPreferencesChange({
                      ...preferences,
                      enableDesktop: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                <div>
                  <strong>桌面系统通知</strong>
                  <span>本任务阶段仅保留偏好设置，不会实际调度系统通知。</span>
                </div>
              </label>

              <label>
                <span>提醒优先级门槛</span>
                <select
                  onChange={(event) =>
                    onPreferencesChange({
                      ...preferences,
                      priorityThreshold: event.target.value as ReminderPriorityThreshold,
                    })
                  }
                  value={preferences.priorityThreshold}
                >
                  {THRESHOLD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>提醒时间</span>
                <select
                  onChange={(event) =>
                    onPreferencesChange({
                      ...preferences,
                      offsetPreset: event.target.value as ReminderOffsetPreset,
                    })
                  }
                  value={preferences.offsetPreset}
                >
                  {OFFSET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {preferences.offsetPreset === 'custom' ? (
                <label>
                  <span>自定义提前分钟数</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      onPreferencesChange({
                        ...preferences,
                        customOffsetMinutes: Number(event.target.value) || 0,
                      })
                    }
                    type="number"
                    value={preferences.customOffsetMinutes}
                  />
                </label>
              ) : null}

              <div className="task-settings-note">
                <p>成功操作会显示在右下角轻提示，失败操作会通过统一错误弹窗反馈。</p>
              </div>

              <div className="task-modal-button-row">
                <button className="secondary-button" onClick={() => onOpenChange(false)} type="button">
                  取消
                </button>
                <button className="primary-button" disabled={isSaving} type="submit">
                  {isSaving ? '保存中...' : '保存设置'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  )
}
