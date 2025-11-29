import { motion } from 'framer-motion'

interface SkeletonLoaderProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export function SkeletonLoader({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: SkeletonLoaderProps) {
  const baseClasses = 'bg-background-tertiary rounded animate-pulse'

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className={`${baseClasses} h-4`}
            style={{
              width: i === lines - 1 ? '80%' : '100%',
            }}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>
    )
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  const shapeClasses =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'text'
      ? 'rounded'
      : 'rounded-lg'

  return (
    <motion.div
      className={`${baseClasses} ${shapeClasses} ${className}`}
      style={style}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
      }}
    />
  )
}

export function TaskSkeleton() {
  return (
    <div className="bg-background-secondary border border-background-tertiary rounded-lg p-4 mb-2">
      <div className="flex items-start gap-3">
        <SkeletonLoader variant="circular" width={20} height={20} />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" width="60%" height={20} />
          <SkeletonLoader variant="text" width="40%" height={16} />
          <div className="flex gap-2">
            <SkeletonLoader variant="rectangular" width={60} height={24} />
            <SkeletonLoader variant="rectangular" width={80} height={24} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <TaskSkeleton key={i} />
      ))}
    </div>
  )
}

