/**
 * 文件说明：统一封装时间显示格式，减少界面层重复判断。
 */
import dayjs from 'dayjs'

/**
 * 格式化任务日期。
 */
export function formatTaskDate(value: string | null, pattern = '截止于 YYYY-MM-DD') {
  if (!value) {
    return '未设置时间'
  }

  const parsedValue = dayjs(value)
  if (!parsedValue.isValid()) {
    return '时间格式无效'
  }

  return parsedValue.format(pattern)
}
