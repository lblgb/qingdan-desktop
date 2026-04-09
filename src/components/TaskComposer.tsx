/**
 * 文件说明：任务录入组件，负责以按钮 + 弹窗的方式创建任务，并提供最小可用的任务组创建入口。
 */
import { useEffect, useState } from 'react'
import { useTaskStore } from '../stores/taskStore'

/**
 * 任务录入组件。
 */
export function TaskComposer() {
  const addTask = useTaskStore((state) => state.addTask)
  const addTaskGroup = useTaskStore((state) => state.addTaskGroup)
  const taskGroups = useTaskStore((state) => state.taskGroups)
  const activeAction = useTaskStore((state) => state.activeAction)
  const isMutating = useTaskStore((state) => state.isMutating)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [groupId, setGroupId] = useState('')
  const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')

  const isSubmittingTask = isMutating && activeAction === 'create'
  const isSubmittingGroup = isMutating && activeAction === 'group'

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmittingTask && !isSubmittingGroup) {
        closeModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, isSubmittingGroup, isSubmittingTask])

  function openModal() {
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setTitle('')
    setDescription('')
    setDueAt('')
    setGroupId('')
    setIsGroupEditorOpen(false)
    setGroupName('')
    setGroupDescription('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

    closeModal()
  }

  async function handleCreateGroup() {
    const nextGroupName = groupName.trim()
    if (!nextGroupName) {
      return
    }

    await addTaskGroup({
      name: nextGroupName,
      description: groupDescription.trim(),
    })

    const latestGroup = useTaskStore.getState().taskGroups[0]
    if (latestGroup) {
      setGroupId(latestGroup.id)
    }

    setGroupName('')
    setGroupDescription('')
    setIsGroupEditorOpen(false)
  }

  return (
    <section className="composer-card">
      <div className="composer-launcher">
        <div className="composer-launch-copy">
          <p className="section-tag">新建任务</p>
          <h2>把录入入口收成一个明确动作，不再长期占据主界面。</h2>
          <p className="section-note">
            第二版开始把“新建任务”切成弹窗流，主界面更多留给筛选、分组和列表决策。
          </p>
        </div>

        <div className="composer-launch-actions">
          <button className="primary-button composer-open-button" onClick={openModal} type="button">
            新建任务
          </button>
          <p className="composer-tip">支持标题、备注、截止日期和所属任务组。</p>
        </div>
      </div>

      {isModalOpen ? (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <section
            className="task-modal"
            aria-labelledby="task-modal-title"
            aria-modal="true"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-modal-header">
              <div>
                <p className="section-tag">任务录入</p>
                <h2 id="task-modal-title">添加一条新的待办</h2>
              </div>
              <button
                className="secondary-button modal-close-button"
                onClick={closeModal}
                type="button"
                disabled={isSubmittingTask || isSubmittingGroup}
              >
                关闭
              </button>
            </div>

            <form className="composer-form task-modal-form" onSubmit={(event) => void handleSubmit(event)}>
              <label htmlFor="task-title">
                <span>标题</span>
                <input
                  id="task-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例如：整理第二版弹窗交互"
                  disabled={isSubmittingTask || isSubmittingGroup}
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
                  disabled={isSubmittingTask || isSubmittingGroup}
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
                    disabled={isSubmittingTask || isSubmittingGroup}
                  />
                </label>

                <label htmlFor="task-group-id">
                  <span>所属任务组</span>
                  <select
                    id="task-group-id"
                    value={groupId}
                    onChange={(event) => setGroupId(event.target.value)}
                    disabled={isSubmittingTask || isSubmittingGroup}
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

              <section className="group-creator-card">
                <div className="group-creator-header">
                  <div>
                    <p className="section-tag">任务组</p>
                    <h3>需要新组时，在这里顺手建一个</h3>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => setIsGroupEditorOpen((value) => !value)}
                    type="button"
                    disabled={isSubmittingTask || isSubmittingGroup}
                  >
                    {isGroupEditorOpen ? '收起' : '新建任务组'}
                  </button>
                </div>

                {isGroupEditorOpen ? (
                  <div className="group-creator-form">
                    <label htmlFor="group-name">
                      <span>任务组名称</span>
                      <input
                        id="group-name"
                        value={groupName}
                        onChange={(event) => setGroupName(event.target.value)}
                        placeholder="例如：版本迭代"
                        disabled={isSubmittingTask || isSubmittingGroup}
                      />
                    </label>

                    <label htmlFor="group-description">
                      <span>任务组说明</span>
                      <input
                        id="group-description"
                        value={groupDescription}
                        onChange={(event) => setGroupDescription(event.target.value)}
                        placeholder="说明这一组主要装什么任务"
                        disabled={isSubmittingTask || isSubmittingGroup}
                      />
                    </label>

                    <div className="group-creator-actions">
                      <p className="composer-tip">创建成功后会自动选中刚建的任务组。</p>
                      <button
                        className="secondary-button"
                        onClick={() => void handleCreateGroup()}
                        type="button"
                        disabled={isSubmittingTask || isSubmittingGroup}
                      >
                        {isSubmittingGroup ? '创建中...' : '保存任务组'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="section-note">当前已有 {taskGroups.length} 个任务组，可直接在上方下拉中选择。</p>
                )}
              </section>

              <div className="composer-actions task-modal-actions">
                <div className="composer-feedback">
                  <p className="composer-tip">建议标题只写动作，备注写上下文，方便后续快速扫清单。</p>
                  {isSubmittingTask ? <span className="inline-feedback">正在保存到本地数据库...</span> : null}
                </div>
                <div className="task-modal-button-row">
                  <button
                    className="secondary-button"
                    onClick={closeModal}
                    type="button"
                    disabled={isSubmittingTask || isSubmittingGroup}
                  >
                    取消
                  </button>
                  <button className="primary-button" type="submit" disabled={isSubmittingTask || isSubmittingGroup}>
                    {isSubmittingTask ? '保存中...' : '创建任务'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}
