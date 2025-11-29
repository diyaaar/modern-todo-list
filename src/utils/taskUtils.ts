import { TaskWithSubtasks } from '../types/task'

/**
 * Calculate completion percentage for a task based on its subtasks
 */
export function calculateCompletionPercentage(task: TaskWithSubtasks): number {
  if (!task.subtasks || task.subtasks.length === 0) {
    return task.completed ? 100 : 0
  }

  const completedCount = task.subtasks.filter((subtask) => subtask.completed).length
  const totalCount = task.subtasks.length

  // Calculate average completion of direct subtasks
  const directCompletion = (completedCount / totalCount) * 100

  // Calculate weighted average including nested subtasks
  let weightedCompletion = 0
  let totalWeight = 0

  task.subtasks.forEach((subtask) => {
    const subtaskCompletion = calculateCompletionPercentage(subtask)
    const weight = 1 // Could be adjusted based on subtask importance
    weightedCompletion += subtaskCompletion * weight
    totalWeight += weight
  })

  return totalWeight > 0 ? Math.round(weightedCompletion / totalWeight) : directCompletion
}

/**
 * Build a tree structure from flat task list
 */
export function buildTaskTree(tasks: TaskWithSubtasks[]): TaskWithSubtasks[] {
  const taskMap = new Map<string, TaskWithSubtasks>()
  const rootTasks: TaskWithSubtasks[] = []

  // Create a map of all tasks
  tasks.forEach((task) => {
    taskMap.set(task.id, { ...task, subtasks: [] })
  })

  // Build the tree
  tasks.forEach((task) => {
    const taskWithSubtasks = taskMap.get(task.id)!
    if (task.parent_task_id) {
      const parent = taskMap.get(task.parent_task_id)
      if (parent) {
        if (!parent.subtasks) {
          parent.subtasks = []
        }
        parent.subtasks.push(taskWithSubtasks)
      }
    } else {
      rootTasks.push(taskWithSubtasks)
    }
  })

  // Sort tasks by position
  const sortByPosition = (tasks: TaskWithSubtasks[]) => {
    tasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    tasks.forEach((task) => {
      if (task.subtasks) {
        sortByPosition(task.subtasks)
      }
    })
  }

  sortByPosition(rootTasks)
  return rootTasks
}

/**
 * Flatten task tree to a flat list
 */
export function flattenTaskTree(tasks: TaskWithSubtasks[]): TaskWithSubtasks[] {
  const result: TaskWithSubtasks[] = []
  
  function traverse(task: TaskWithSubtasks) {
    result.push(task)
    if (task.subtasks) {
      task.subtasks.forEach(traverse)
    }
  }
  
  tasks.forEach(traverse)
  return result
}

