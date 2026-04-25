import { formatTaskDate } from '../lib/date'

function formatBackupTimestamp(value: string | null) {
  if (!value) {
    return null
  }

  return formatTaskDate(value, 'YYYY-MM-DD HH:mm')
}

interface BackupCenterProps {
  isOpen: boolean
  lastBackupAt: string | null
  onOpenChange: (isOpen: boolean) => void
  onBackupNow: () => void
  onRestoreFromBackup: () => void
  onExportJson: () => void
  onExportCsv: () => void
}

export function BackupCenter({
  isOpen,
  lastBackupAt,
  onOpenChange,
  onBackupNow,
  onRestoreFromBackup,
  onExportJson,
  onExportCsv,
}: BackupCenterProps) {
  const formattedLastBackupAt = formatBackupTimestamp(lastBackupAt)

  return (
    <>
      <button
        aria-label="备份与恢复"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="icon-button icon-button-console"
        onClick={() => onOpenChange(true)}
        type="button"
      >
        <span aria-hidden="true" className="icon-button-glyph">
          BR
        </span>
        <span>备份</span>
      </button>

      {isOpen ? (
        <div className="modal-backdrop" onClick={() => onOpenChange(false)} role="presentation">
          <section
            aria-labelledby="backup-center-title"
            aria-modal="true"
            className="task-modal task-modal-compact backup-center-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="task-modal-header">
              <div>
                <p className="section-tag">数据安全</p>
                <h2 id="backup-center-title">备份与恢复中心</h2>
              </div>
              <button className="secondary-button modal-close-button" onClick={() => onOpenChange(false)} type="button">
                关闭
              </button>
            </div>

            <div className="backup-center-summary">
              <strong>{formattedLastBackupAt ? '最近备份' : '尚无备份记录'}</strong>
              <p>
                {formattedLastBackupAt
                  ? `最近一次本地备份时间：${formattedLastBackupAt}`
                  : '当前仅提供前端面板骨架，真实备份与恢复命令将在后续任务接入。'}
              </p>
            </div>

            <div className="backup-center-actions">
              <button
                className="primary-button backup-center-action"
                disabled
                onClick={onBackupNow}
                type="button"
              >
                <strong>立即备份</strong>
                <span>创建新的本地备份快照。当前仅展示入口，不执行真实命令。</span>
              </button>

              <button
                className="secondary-button backup-center-action"
                disabled
                onClick={onRestoreFromBackup}
                type="button"
              >
                <strong>从备份恢复</strong>
                <span>选择已有备份并恢复数据。当前仅展示入口，不执行真实命令。</span>
              </button>

              <button
                className="secondary-button backup-center-action"
                disabled
                onClick={onExportJson}
                type="button"
              >
                <strong>导出 JSON</strong>
                <span>导出结构化数据文件。当前仅展示入口，不执行真实命令。</span>
              </button>

              <button
                className="secondary-button backup-center-action"
                disabled
                onClick={onExportCsv}
                type="button"
              >
                <strong>导出 CSV</strong>
                <span>导出表格格式数据。当前仅展示入口，不执行真实命令。</span>
              </button>
            </div>

            <div className="backup-center-note">
              <p>本阶段不接入 Tauri 备份、恢复或导出命令，仅完成入口、面板和状态字段骨架。</p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
