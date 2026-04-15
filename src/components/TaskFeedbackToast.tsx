import { useEffect } from 'react'
import { useTaskStore } from '../stores/taskStore'

const TOAST_DURATION_MS = 2400

export function TaskFeedbackToast() {
  const successToast = useTaskStore((state) => state.successToast)

  useEffect(() => {
    if (!successToast) {
      return
    }

    const timer = window.setTimeout(() => {
      useTaskStore.setState({ successToast: null })
    }, TOAST_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [successToast])

  if (!successToast) {
    return null
  }

  return (
    <div aria-live="polite" className="task-feedback-toast" role="status">
      <strong>操作已完成</strong>
      <span>{successToast.message}</span>
    </div>
  )
}
