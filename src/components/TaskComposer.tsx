/**
 * 文件说明：顶部动作组件，统一提供“新建任务”和“新建任务组”入口，并承载对应弹窗。
 */
import { useEffect, useRef, useState } from 'react'
import { useTaskStore } from '../stores/taskStore'

/**
 * 顶部动作组件。
 */
export function TaskComposer() {
  const addTask = useTaskStore((state) => state.addTask)
  const addTaskGroup = useTaskStore((state) => state.addTaskGroup)
  const taskGroups = useTaskStore((state) => state.taskGroups)
  const activeAction = useTaskStore((state) => state.activeAction)
  const isMutating = useTaskStore((state) => state.isMutating)

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [groupId, setGroupId] = useState('')

  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')

  const menuRef = useRef<HTMLDivElement | null>(null)

  const isSubmittingTask = isMutating && activeAction === 'create'
  const isSubmittingGroup = isMutating && activeAction === 'group'

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isTaskModalOpen && !isGroupModalOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || isSubmittingTask || isSubmittingGroup) {
        return
      }

      if (isTaskModalOpen) {
        closeTaskModal()
      }

      if (isGroupModalOpen) {
        closeGroupModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isGroupModalOpen, isSubmittingGroup, isSubmittingTask, isTaskModalOpen])

  function openTaskModal() {
    setIsMenuOpen(false)
    setIsTaskModalOpen(true)
  }

  function openGroupModal() {
    setIsMenuOpen(false)
    setIsGroupModalOpen(true)
  }

  function closeTaskModal() {
    setIsTaskModalOpen(false)
    setTitle('')
    setDescription('')
    setDueAt('')
    setGroupId('')
  }

  function closeGroupModal() {
    setIsGroupModalOpen(false)
    setGroupName('')
    setGroupDescription('')
  }

  async function handleSubmitTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextTitle = title.trim()
    if (!nextTitle) {
      return
    }

    await addTask({
      title: nextTitle,
      description: description.trim(),
      groupId: groupId || null,
      dueAt: dueAt || null,
    })

    closeTaskModal()
  }

  async function handleSubmitGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextGroupName = groupName.trim()
    if (!nextGroupName) {
      return
    }

    await addTaskGroup({
      name: nextGroupName,
      description: groupDescription.trim(),
    })

    closeGroupModal()
  }

  return (
    <>
      <div ref={menuRef} className="composer-toolbar">
        <button
          className="primary-button toolbar-trigger-button"
          onClick={() => setIsMenuOpen((value) => !value)}
          type="button"
        >
          新建
        </button>

        {isMenuOpen ? (
          <div className="toolbar-menu">
            <button className="toolbar-menu-button" onClick={openTaskModal} type="button">
              <strong>新建任务</strong>
              <span>录入标题、备注、日期和所属组</span>
            </button>
            <button className="toolbar-menu-button" onClick={openGroupModal} type="button">
              <strong>新建任务组</strong>
              <span>先建一个新的任务归类</span>
            </button>
          </div>
        ) : null}
      </div>

      {isTaskModalOpen ? (
        <div className="modal-backdrop" onClick={closeTaskModal} role="presentation">
          <section
            className="task-modal"
            aria-labelledby="task-modal-title"
            aria-modal="true"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-modal-header">
              <div>
                <h2 id="task-modal-title">新建任务</h2>
              </div>
              <button
                className="secondary-button modal-close-button"
                onClick={closeTaskModal}
                type="button"
                disabled={isSubmittingTask}
              >
                关闭
              </button>
            </div>

            <form className="composer-form task-modal-form" onSubmit={(event) => void handleSubmitTask(event)}>
              <label htmlFor="task-title">
                <span>标题</span>
                <input
                  id="task-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例如：整理第二版验收问题"
                  disabled={isSubmittingTask}
                />
              </label>

              <label htmlFor="task-description">
                <span>备注</span>
                <textarea
                  id="task-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="补充目标、上下文或拆解点"
                  rows={4}
                  disabled={isSubmittingTask}
                />
              </label>

              <div className="task-modal-grid">
                <label htmlFor="task-due-at">
                  <span>截止日期</span>
                  <input
                    id="task-due-at"
                    type="date"
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                    disabled={isSubmittingTask}
                  />
                </label>

                <label htmlFor="task-group-id">
                  <span>所属任务组</span>
                  <select
                    id="task-group-id"
                    value={groupId}
                    onChange={(event) => setGroupId(event.target.value)}
                    disabled={isSubmittingTask}
                  >
                    <option value="">未分组</option>
                    {taskGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="composer-actions task-modal-actions">
                <div className="composer-feedback">
                  {isSubmittingTask ? <span className="inline-feedback">正在保存到本地数据库...</span> : null}
                </div>
                <div className="task-modal-button-row">
                  <button className="secondary-button" onClick={closeTaskModal} type="button" disabled={isSubmittingTask}>
                    取消
                  </button>
                  <button className="primary-button" type="submit" disabled={isSubmittingTask}>
                    {isSubmittingTask ? '保存中...' : '创建任务'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isGroupModalOpen ? (
        <div className="modal-backdrop" onClick={closeGroupModal} role="presentation">
          <section
            className="task-modal task-modal-compact"
            aria-labelledby="group-modal-title"
            aria-modal="true"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-modal-header">
              <div>
                <h2 id="group-modal-title">新建任务组</h2>
              </div>
              <button
                className="secondary-button modal-close-button"
                onClick={closeGroupModal}
                type="button"
                disabled={isSubmittingGroup}
              >
                关闭
              </button>
            </div>

            <form className="composer-form task-modal-form" onSubmit={(event) => void handleSubmitGroup(event)}>
              <label htmlFor="group-name">
                <span>任务组名称</span>
                <input
                  id="group-name"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="例如：版本迭代"
                  disabled={isSubmittingGroup}
                />
              </label>

              <label htmlFor="group-description">
                <span>任务组说明</span>
                <textarea
                  id="group-description"
                  value={groupDescription}
                  onChange={(event) => setGroupDescription(event.target.value)}
                  placeholder="说明这一组主要装什么任务"
                  rows={3}
                  disabled={isSubmittingGroup}
                />
              </label>

              <div className="composer-actions task-modal-actions">
                <div className="composer-feedback">
                  {isSubmittingGroup ? <span className="inline-feedback">正在创建任务组...</span> : null}
                </div>
                <div className="task-modal-button-row">
                  <button className="secondary-button" onClick={closeGroupModal} type="button" disabled={isSubmittingGroup}>
                    取消
                  </button>
                  <button className="primary-button" type="submit" disabled={isSubmittingGroup}>
                    {isSubmittingGroup ? '创建中...' : '创建任务组'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  )
}
