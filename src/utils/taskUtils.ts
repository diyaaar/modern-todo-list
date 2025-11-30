import { TaskWithSubtasks } from '../types/task'

/**
 * Calculate completion percentage for a task based on all its descendant subtasks (recursive)
 * Formula: (completed_descendants / total_descendants) * 100
 * Counts all subtasks at every depth in the hierarchy
 */
export function calculateCompletionPercentage(task: TaskWithSubtasks): number {
  // If task has no subtasks, return 100% if completed, 0% if not
  if (!task.subtasks || task.subtasks.length === 0) {
    return task.completed ? 100 : 0
  }

  // Recursively count all descendant subtasks (at every depth)
  let totalDescendants = 0
  let completedDescendants = 0

  function countDescendants(subtasks: TaskWithSubtasks[]) {
    subtasks.forEach((subtask) => {
      // Count this subtask
      totalDescendants++
      if (subtask.completed) {
        completedDescendants++
      }
      
      // Recursively count nested subtasks
      if (subtask.subtasks && subtask.subtasks.length > 0) {
        countDescendants(subtask.subtasks)
      }
    })
  }

  countDescendants(task.subtasks)

  if (totalDescendants === 0) {
    return task.completed ? 100 : 0
  }

  // Calculate percentage: (completed_descendants / total_descendants) * 100
  const percentage = (completedDescendants / totalDescendants) * 100
  
  // Round to nearest integer for display
  return Math.round(percentage)
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

