/**
 * 文件说明：任务快速录入组件，负责创建第一版的基础任务。
 */
import { useState } from 'react'
import { useTaskStore } from '../stores/taskStore'

/**
 * 任务录入组件。
 */
export function TaskComposer() {
  const addTask = useTaskStore((state) => state.addTask)
  const activeAction = useTaskStore((state) => state.activeAction)
  const isMutating = useTaskStore((state) => state.isMutating)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const isSubmitting = isMutating && activeAction === 'create'

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextTitle = title.trim()
    if (!nextTitle) {
      return
    }

    void addTask({
      title: nextTitle,
      description: description.trim(),
      groupId: null,
      dueAt: dueAt || null,
    }).then(() => {
      setTitle('')
      setDescription('')
      setDueAt('')
    })
  }

  return (
    <section className="composer-card">
      <div className="section-heading">
        <div>
          <p className="section-tag">新建任务</p>
          <h2>快速记录当前要推进的事项</h2>
        </div>
        <p className="section-note">先让录入动作足够快，再把数据层切换到真实桌面存储。</p>
      </div>

      <form className="composer-form" onSubmit={handleSubmit}>
        <label htmlFor="task-title">
          <span>标题</span>
          <input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：整理第一版功能清单"
            disabled={isSubmitting}
          />
        </label>
        <label htmlFor="task-description">
          <span>备注</span>
          <textarea
            id="task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="补充背景、目标或拆解点"
            rows={3}
            disabled={isSubmitting}
          />
        </label>
        <label htmlFor="task-due-at">
          <span>截止日期</span>
          <input
            id="task-due-at"
            type="date"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={isSubmitting}
          />
        </label>

        <div className="composer-actions">
          <div className="composer-feedback">
            <p className="composer-tip">建议标题只写动作，不写长句，列表会更利落。</p>
            {isSubmitting ? <span className="inline-feedback">正在保存到本地数据库...</span> : null}
          </div>
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '添加任务'}
          </button>
        </div>
      </form>
    </section>
  )
}
