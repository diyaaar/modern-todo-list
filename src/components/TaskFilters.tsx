import { Search, Filter, SortAsc, Calendar, Tag, Archive } from 'lucide-react'
import { useTasks } from '../contexts/TasksContext'
import { useTags } from '../contexts/TagsContext'
import { TaskFilter, TaskSort } from '../types/task'

export function TaskFilters() {
  const {
    filter,
    setFilter,
    sort,
    setSort,
    searchQuery,
    setSearchQuery,
    selectedTagIds,
    setSelectedTagIds,
    dateRangeStart,
    setDateRangeStart,
    dateRangeEnd,
    setDateRangeEnd,
  } = useTasks()
  const { tags } = useTags()

  return (
    <div className="bg-background-secondary border border-background-tertiary rounded-lg p-3 sm:p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            aria-label="Search tasks"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-tertiary" />
          <select
            value={filter}
            onChange={(e) => {
              const newFilter = e.target.value as TaskFilter
              console.log('[TaskFilters] Filter changed to:', newFilter)
              setFilter(newFilter)
            }}
            className="px-3 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            aria-label="Filter tasks by status"
          >
            <option value="all">All Tasks</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          {filter === 'archived' && (
            <span className="text-xs text-primary font-medium">(Viewing Archive)</span>
          )}
        </div>

        {/* Archive Toggle Button - More prominent way to switch to archive view */}
        <button
          onClick={() => {
            const newFilter = filter === 'archived' ? 'all' : 'archived'
            console.log('[TaskFilters] Switching to filter:', newFilter)
            setFilter(newFilter)
          }}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
            focus:outline-none focus:ring-2 focus:ring-primary
            ${
              filter === 'archived'
                ? 'bg-primary text-white hover:bg-primary-dark shadow-lg'
                : 'bg-background-tertiary text-text-primary hover:bg-background-tertiary/80 border border-background-tertiary hover:border-primary/50'
            }
          `}
          aria-label={filter === 'archived' ? 'Show active tasks' : 'Show archived tasks'}
          title={filter === 'archived' ? 'Show active tasks' : 'Show archived tasks'}
        >
          <Archive className="w-4 h-4" />
          <span>{filter === 'archived' ? 'Active' : 'Archive'}</span>
        </button>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-text-tertiary" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as TaskSort)}
            className="px-3 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            aria-label="Sort tasks"
          >
            <option value="created">Created Date</option>
            <option value="deadline">Deadline</option>
            <option value="priority">Priority</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      {/* Tag Filter */}
      {tags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-background-tertiary">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-text-tertiary" />
            <span className="text-sm text-text-secondary">Filter by tags:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => {
                  if (selectedTagIds.includes(tag.id)) {
                    setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id))
                  } else {
                    setSelectedTagIds([...selectedTagIds, tag.id])
                  }
                }}
                className={`
                  px-2 py-1 rounded-full text-xs font-medium border transition-all
                  active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary
                  ${
                    selectedTagIds.includes(tag.id)
                      ? 'border-primary'
                      : 'border-background-tertiary hover:border-primary/50'
                  }
                `}
                style={{
                  backgroundColor: selectedTagIds.includes(tag.id) ? `${tag.color}20` : 'transparent',
                  color: tag.color,
                }}
                aria-label={`Filter by ${tag.name} tag`}
                aria-pressed={selectedTagIds.includes(tag.id)}
              >
                {tag.name}
              </button>
            ))}
            {selectedTagIds.length > 0 && (
              <button
                onClick={() => setSelectedTagIds([])}
                className="px-2 py-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="mt-4 pt-4 border-t border-background-tertiary">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm text-text-secondary">Date range:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dateRangeStart || ''}
            onChange={(e) => setDateRangeStart(e.target.value || null)}
            placeholder="Start date"
            className="px-3 py-1.5 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            aria-label="Filter by start date"
          />
          <span className="text-text-tertiary text-sm">to</span>
          <input
            type="date"
            value={dateRangeEnd || ''}
            onChange={(e) => setDateRangeEnd(e.target.value || null)}
            placeholder="End date"
            className="px-3 py-1.5 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            aria-label="Filter by end date"
          />
          {(dateRangeStart || dateRangeEnd) && (
            <button
              onClick={() => {
                setDateRangeStart(null)
                setDateRangeEnd(null)
              }}
              className="px-2 py-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

