/**
 * 文件说明：任务组管理组件，负责展示当前任务组并提供改名、备注调整和删除操作。
 */
import { useState } from 'react'
import type { TaskGroup } from '../features/tasks/task.types'
import { useTaskStore } from '../stores/taskStore'

/**
 * 任务组管理组件。
 */
export function TaskGroupManager() {
  const tasks = useTaskStore((state) => state.tasks)
  const taskGroups = useTaskStore((state) => state.taskGroups)
  const activeGroupFilter = useTaskStore((state) => state.activeGroupFilter)
  const setGroupFilter = useTaskStore((state) => state.setGroupFilter)
  const updateTaskGroup = useTaskStore((state) => state.updateTaskGroup)
  const removeTaskGroup = useTaskStore((state) => state.removeTaskGroup)
  const isMutating = useTaskStore((state) => state.isMutating)
  const activeAction = useTaskStore((state) => state.activeAction)
  const isGroupMutating = isMutating && activeAction === 'group'

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

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
    <section className="task-group-manager-card panel-surface">
      <div className="section-heading">
        <div>
          <p className="section-tag">任务组管理</p>
          <h2>整理任务组</h2>
        </div>
        <p className="section-note">这里专门处理任务组本身，任务清单区域只保留筛选和列表浏览。</p>
      </div>

      {taskGroups.length === 0 ? (
        <div className="group-manager-empty">
          <strong>还没有正式创建任务组</strong>
          <p>可以先从“新建任务”弹窗里顺手建一个，后面再回到这里整理命名和说明。</p>
        </div>
      ) : (
        <div className="group-manager-list">
          {taskGroups.map((group) => {
            const taskCount = tasks.filter((task) => task.groupId === group.id).length
            const isEditing = editingGroupId === group.id
            const isActive = activeGroupFilter === group.id

            return (
              <article key={group.id} className={isActive ? 'group-manager-item active' : 'group-manager-item'}>
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
                        placeholder="说明这一组主要承载什么任务"
                        rows={3}
                        disabled={isGroupMutating}
                      />
                    </label>

                    <div className="group-manager-meta">
                      <span>{taskCount} 项任务</span>
                      <span>{isActive ? '当前正在按此组筛选' : '当前未选中此组'}</span>
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
                      <span>{isActive ? '当前筛选中' : '可切换筛选查看这一组'}</span>
                      <span>{taskCount === 0 ? '当前为空组' : '组内已有任务'}</span>
                    </div>
                  </div>
                )}

                <div className="task-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="secondary-button"
                        onClick={handleCancelEdit}
                        type="button"
                        disabled={isGroupMutating}
                      >
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
                      <button
                        className={isActive ? 'secondary-button active-chip-button' : 'secondary-button'}
                        onClick={() => setGroupFilter(group.id)}
                        type="button"
                        disabled={isGroupMutating}
                      >
                        {isActive ? '当前筛选中' : '按此组查看'}
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => handleStartEdit(group)}
                        type="button"
                        disabled={isGroupMutating}
                      >
                        编辑
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => void handleRemoveGroup(group.id)}
                        type="button"
                        disabled={isGroupMutating}
                      >
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
  )
}
