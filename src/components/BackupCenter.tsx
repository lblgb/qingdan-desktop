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

  return (
    <>
      <button
        aria-label="澶囦唤涓庢仮澶?"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="icon-button icon-button-console"
        onClick={() => onOpenChange(true)}
        type="button"
      >
        <span aria-hidden="true" className="icon-button-glyph">
          BR
        </span>
        <span>澶囦唤</span>
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
                <p className="section-tag">鏁版嵁瀹夊叏</p>
                <h2 id="backup-center-title">澶囦唤涓庢仮澶嶄腑蹇?</h2>
              </div>
              <button className="secondary-button modal-close-button" onClick={() => onOpenChange(false)} type="button">
                鍏抽棴
              </button>
            </div>

            <div className="backup-center-summary">
              <strong>{formattedLastBackupAt ? '鏈€杩戝浠?' : '灏氭棤澶囦唤璁板綍'}</strong>
              <p>
                {formattedLastBackupAt
                  ? `鏈€杩戜竴娆℃湰鍦板浠芥椂闂达細${formattedLastBackupAt}`
                  : '可以手动输入备份文件路径，创建本地备份或从现有备份恢复。'}
              </p>
            </div>

            <div className="backup-center-actions">
              <button className="primary-button backup-center-action" onClick={handleBackupNow} type="button">
                <strong>绔嬪嵆澶囦唤</strong>
                <span>创建新的本地备份快照。</span>
              </button>

              <button className="secondary-button backup-center-action" onClick={handleRestoreFromBackup} type="button">
                <strong>浠庡浠芥仮澶?</strong>
                <span>输入已有备份路径并确认恢复。</span>
              </button>

              <button className="secondary-button backup-center-action" disabled onClick={onExportJson} type="button">
                <strong>瀵煎嚭 JSON</strong>
                <span>导出结构化数据文件。当前阶段未接线。</span>
              </button>

              <button className="secondary-button backup-center-action" disabled onClick={onExportCsv} type="button">
                <strong>瀵煎嚭 CSV</strong>
                <span>导出表格格式数据。当前阶段未接线。</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
