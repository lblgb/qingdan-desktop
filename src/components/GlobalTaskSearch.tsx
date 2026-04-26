/**
 * 文件说明：顶部全局任务搜索面板，支持输入关键字并选择目标任务。
 */
import type { TaskSearchResult } from '../features/tasks/task.types'

interface GlobalTaskSearchProps {
  keyword: string
  results: TaskSearchResult[]
  onKeywordChange: (keyword: string) => void
  onSelect: (taskId: string) => void
}

export function GlobalTaskSearch({ keyword, results, onKeywordChange, onSelect }: GlobalTaskSearchProps) {
  const isOpen = keyword.trim().length > 0

  return (
    <div className="global-task-search">
      <input
        aria-label="搜索任务"
        className="global-task-search-input"
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="搜索标题或备注"
        type="search"
        value={keyword}
      />

      {isOpen ? (
        <div className="global-task-search-panel">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                key={result.task.id}
                className="global-task-search-result"
                onClick={() => onSelect(result.task.id)}
                type="button"
              >
                <strong>{result.task.title}</strong>
                <span>{result.matchedField === 'title' ? '标题匹配' : '备注匹配'}</span>
              </button>
            ))
          ) : (
            <div className="global-task-search-empty">
              <strong>未找到匹配任务</strong>
              <span>可以尝试标题关键字或备注内容。</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
