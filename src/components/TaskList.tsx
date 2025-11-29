import { memo } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { TaskWithSubtasks } from '../types/task'
import { Task } from './Task'
import { useTasks } from '../contexts/TasksContext'

interface SortableTaskProps {
  task: TaskWithSubtasks
  depth?: number
}

function SortableTask({ task, depth = 0 }: SortableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-4 p-1 cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <Task task={task} depth={depth} />
        </div>
      </div>
    </div>
  )
}

export const TaskList = memo(function TaskList() {
  const { filteredAndSortedTasks, updateTask } = useTasks()
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    // Find the tasks being moved
    const allTasks = filteredAndSortedTasks
    const activeTask = findTaskById(allTasks, active.id as string)
    const overTask = findTaskById(allTasks, over.id as string)

    if (!activeTask || !overTask) return

    // Update positions
    // For simplicity, we'll update the position based on the over task's position
    // In a more sophisticated implementation, you'd recalculate all positions
    const newPosition = (overTask.position ?? 0) + 1

    await updateTask(active.id as string, {
      position: newPosition,
    })
  }

  const findTaskById = (tasks: TaskWithSubtasks[], id: string): TaskWithSubtasks | null => {
    for (const task of tasks) {
      if (task.id === id) return task
      if (task.subtasks) {
        const found = findTaskById(task.subtasks, id)
        if (found) return found
      }
    }
    return null
  }

  if (filteredAndSortedTasks.length === 0) {
    return (
      <div className="text-center py-12 text-text-tertiary">
        <p>No tasks found. Create your first task to get started!</p>
      </div>
    )
  }

  // Flatten tasks for drag and drop (only root level tasks are sortable)
  const rootTaskIds = filteredAndSortedTasks.map((task) => task.id)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={rootTaskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {filteredAndSortedTasks.map((task) => (
            <SortableTask key={task.id} task={task} depth={0} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
})

