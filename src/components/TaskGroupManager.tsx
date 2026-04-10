/**
 * 文件说明：顶部任务组管理入口，集中提供任务组的查看、新建、编辑和删除操作。
 */
import { useEffect, useState } from 'react'
import type { TaskGroup } from '../features/tasks/task.types'
import { useTaskStore } from '../stores/taskStore'

export function TaskGroupManager() {
  const tasks = useTaskStore((state) => state.tasks)
  const taskGroups = useTaskStore((state) => state.taskGroups)
  const addTaskGroup = useTaskStore((state) => state.addTaskGroup)
  const updateTaskGroup = useTaskStore((state) => state.updateTaskGroup)
  const removeTaskGroup = useTaskStore((state) => state.removeTaskGroup)
  const isMutating = useTaskStore((state) => state.isMutating)
  const activeAction = useTaskStore((state) => state.activeAction)
  const isGroupMutating = isMutating && activeAction === 'group'

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isGroupMutating) {
        closeModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, isGroupMutating])

  function closeModal() {
    setIsModalOpen(false)
    handleCancelEdit()
    setNewGroupName('')
    setNewGroupDescription('')
  }

  function handleStartEdit(group: TaskGroup) {
    setEditingGroupId(group.id)
    setEditingName(group.name)
    setEditingDescription(group.description)
  }

  function handleCancelEdit() {
    setEditingGroupId(null)
    setEditingName('')
    setEditingDescription('')
  }

  async function handleCreateGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextName = newGroupName.trim()
    if (!nextName) {
      return
    }

    await addTaskGroup({
      name: nextName,
      description: newGroupDescription.trim(),
    })

    setNewGroupName('')
    setNewGroupDescription('')
  }

  async function handleSubmitEdit(groupId: string) {
    const nextName = editingName.trim()
    if (!nextName) {
      return
    }

    await updateTaskGroup({
      id: groupId,
      name: nextName,
      description: editingDescription.trim(),
    })

    handleCancelEdit()
  }

  async function handleRemoveGroup(groupId: string) {
    await removeTaskGroup(groupId)

    if (editingGroupId === groupId) {
      handleCancelEdit()
    }
  }

  return (
    <>
      <button className="secondary-button overview-trigger-button" onClick={() => setIsModalOpen(true)} type="button">
        任务组管理
      </button>

      {isModalOpen ? (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <section
            className="task-modal overview-modal"
            aria-labelledby="task-group-manager-title"
            aria-modal="true"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-modal-header">
              <div>
                <p className="section-tag">任务组管理</p>
                <h2 id="task-group-manager-title">整理任务组</h2>
              </div>
              <button className="secondary-button modal-close-button" onClick={closeModal} type="button" disabled={isGroupMutating}>
                关闭
              </button>
            </div>

            <section className="group-creator-card">
              <div className="group-creator-header">
                <div>
                  <h3>新建任务组</h3>
                  <p className="section-note">任务组属于附加属性，这里集中维护，主界面继续专注任务清单本身。</p>
                </div>
              </div>

              <form className="group-creator-form" onSubmit={(event) => void handleCreateGroup(event)}>
                <label className="task-edit-field" htmlFor="create-group-name">
                  <span>任务组名称</span>
                  <input
                    id="create-group-name"
                    value={newGroupName}
                    onChange={(event) => setNewGroupName(event.target.value)}
                    placeholder="例如：版本迭代"
                    disabled={isGroupMutating}
                  />
                </label>

                <label className="task-edit-field" htmlFor="create-group-description">
                  <span>任务组说明</span>
                  <textarea
                    id="create-group-description"
                    value={newGroupDescription}
                    onChange={(event) => setNewGroupDescription(event.target.value)}
                    placeholder="说明这组任务主要负责什么"
                    rows={3}
                    disabled={isGroupMutating}
                  />
                </label>

                <div className="group-creator-actions">
                  {isGroupMutating ? <span className="inline-feedback">正在处理任务组变更...</span> : <span className="composer-tip">后续如果扩优先级、标签等属性，也会沿这套层级走。</span>}
                  <button className="primary-button" type="submit" disabled={isGroupMutating}>
                    新建任务组
                  </button>
                </div>
              </form>
            </section>

            {taskGroups.length === 0 ? (
              <div className="group-manager-empty">
                <strong>还没有正式创建任务组</strong>
                <p>可以先新建一个任务组，后续再把任务归进去并用于筛选。</p>
              </div>
            ) : (
              <div className="group-manager-list">
                {taskGroups.map((group) => {
                  const taskCount = tasks.filter((task) => task.groupId === group.id).length
                  const isEditing = editingGroupId === group.id

                  return (
                    <article key={group.id} className="group-manager-item">
                      {isEditing ? (
                        <div className="group-manager-body">
                          <label className="task-edit-field" htmlFor={`group-edit-name-${group.id}`}>
                            <span>任务组名称</span>
                            <input
                              id={`group-edit-name-${group.id}`}
                              value={editingName}
                              onChange={(event) => setEditingName(event.target.value)}
                              placeholder="例如：版本迭代"
                              disabled={isGroupMutating}
                            />
                          </label>

                          <label className="task-edit-field" htmlFor={`group-edit-description-${group.id}`}>
                            <span>任务组说明</span>
                            <textarea
                              id={`group-edit-description-${group.id}`}
                              value={editingDescription}
                              onChange={(event) => setEditingDescription(event.target.value)}
                              placeholder="说明这组任务主要承载什么任务"
                              rows={3}
                              disabled={isGroupMutating}
                            />
                          </label>

                          <div className="group-manager-meta">
                            <span>{taskCount} 项任务</span>
                            <span>{taskCount === 0 ? '当前为空组' : '组内已有任务'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="group-manager-body">
                          <div className="group-manager-heading">
                            <div>
                              <h3>{group.name}</h3>
                              <p>{group.description || '还没有补充任务组说明。'}</p>
                            </div>
                            <span className="task-group-count">{taskCount}</span>
                          </div>

                          <div className="group-manager-meta">
                            <span>{taskCount} 项任务</span>
                            <span>{taskCount === 0 ? '当前为空组' : '组内已有任务'}</span>
                          </div>
                        </div>
                      )}

                      <div className="task-actions">
                        {isEditing ? (
                          <>
                            <button className="secondary-button" onClick={handleCancelEdit} type="button" disabled={isGroupMutating}>
                              取消
                            </button>
                            <button
                              className="primary-button task-save-button"
                              onClick={() => void handleSubmitEdit(group.id)}
                              type="button"
                              disabled={isGroupMutating}
                            >
                              保存
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="secondary-button" onClick={() => handleStartEdit(group)} type="button" disabled={isGroupMutating}>
                              编辑
                            </button>
                            <button className="ghost-button" onClick={() => void handleRemoveGroup(group.id)} type="button" disabled={isGroupMutating}>
                              删除
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  )
}
