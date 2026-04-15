import { useTaskStore } from '../stores/taskStore'

export function TaskErrorDialog() {
  const errorDialog = useTaskStore((state) => state.errorDialog)
  const closeErrorDialog = useTaskStore((state) => state.closeErrorDialog)

  if (!errorDialog) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={closeErrorDialog} role="presentation">
      <section
        aria-labelledby="task-error-dialog-title"
        aria-modal="true"
        className="task-modal task-modal-compact task-error-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="task-modal-header">
          <div>
            <p className="section-tag">错误提示</p>
            <h2 id="task-error-dialog-title">{errorDialog.title}</h2>
          </div>
          <button
            className="secondary-button modal-close-button"
            onClick={closeErrorDialog}
            type="button"
          >
            关闭
          </button>
        </div>

        <div className="task-error-dialog-body">
          <p>{errorDialog.message}</p>
          <div className="task-modal-button-row">
            <button
              className="primary-button"
              onClick={closeErrorDialog}
              type="button"
            >
              知道了
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
