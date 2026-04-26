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
  onBackupNow: (backupPath: string) => Promise<boolean> | boolean
  onRestoreFromBackup: (backupPath: string) => Promise<boolean> | boolean
  onExportJson: (exportPath: string) => Promise<boolean> | boolean
  onExportCsv: (exportPath: string) => Promise<boolean> | boolean
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

  async function handleBackupNow() {
    const backupPath = window.prompt('请输入备份文件路径', 'C:\\backup\\qingdan.db')
    if (!backupPath?.trim()) {
      return
    }

    await onBackupNow(backupPath.trim())
  }

  async function handleRestoreFromBackup() {
    const backupPath = window.prompt('请输入要恢复的备份文件路径', 'C:\\backup\\qingdan.db')
    if (!backupPath?.trim()) {
      return
    }

    const isConfirmed = window.confirm('恢复会使用备份覆盖当前任务数据，是否继续？')
    if (!isConfirmed) {
      return
    }

    const isSuccess = await onRestoreFromBackup(backupPath.trim())
    if (isSuccess) {
      onOpenChange(false)
    }
  }

  async function handleExportJson() {
    const exportPath = window.prompt('请输入 JSON 导出文件路径', 'C:\\backup\\qingdan-export.json')
    if (!exportPath?.trim()) {
      return
    }

    await onExportJson(exportPath.trim())
  }

  async function handleExportCsv() {
    const exportPath = window.prompt('请输入 CSV 导出文件路径', 'C:\\backup\\qingdan-export.csv')
    if (!exportPath?.trim()) {
      return
    }

    await onExportCsv(exportPath.trim())
  }

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
                <p className="section-tag">数据维护</p>
                <h2 id="backup-center-title">备份与恢复中心</h2>
              </div>
              <button className="secondary-button modal-close-button" onClick={() => onOpenChange(false)} type="button">
                关闭
              </button>
            </div>

            <div className="backup-center-summary">
              <strong>{formattedLastBackupAt ? '最近备份时间' : '尚未创建备份'}</strong>
              <p>
                {formattedLastBackupAt
                  ? `最近一次本地备份创建于 ${formattedLastBackupAt}`
                  : '可以手动输入备份文件路径，创建本地备份、从现有备份恢复，或导出工作台快照与任务清单。'}
              </p>
            </div>

            <div className="backup-center-actions">
              <button className="primary-button backup-center-action" onClick={handleBackupNow} type="button">
                <strong>立即备份</strong>
                <span>创建新的本地备份快照。</span>
              </button>

              <button className="secondary-button backup-center-action" onClick={handleRestoreFromBackup} type="button">
                <strong>从备份恢复</strong>
                <span>输入已有备份路径并确认恢复。</span>
              </button>

              <button className="secondary-button backup-center-action" onClick={handleExportJson} type="button">
                <strong>导出 JSON</strong>
                <span>导出任务、任务组和提醒偏好快照。</span>
              </button>

              <button className="secondary-button backup-center-action" onClick={handleExportCsv} type="button">
                <strong>导出 CSV</strong>
                <span>导出包含任务组名称的任务清单。</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
