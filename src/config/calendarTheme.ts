/**
 * Calendar theme configuration
 * Centralized styling constants for calendar components
 */

export const calendarTheme = {
  colors: {
    today: {
      bg: 'bg-primary/10',
      border: 'border-primary',
      text: 'text-primary',
      ring: 'ring-2 ring-primary',
    },
    weekend: {
      bg: 'bg-background-secondary/50',
    },
    past: {
      opacity: 'opacity-60',
    },
    currentTime: {
      line: 'bg-danger',
      dot: 'bg-danger',
    },
    event: {
      hover: 'hover:shadow-lg hover:scale-102',
      transition: 'transition-all duration-200',
    },
  },
  animations: {
    eventHover: 'hover:scale-102 hover:shadow-lg transition-all duration-200',
    fadeIn: 'animate-fadeIn',
    slideUp: 'animate-slideUp',
    scaleIn: 'animate-scale-in',
    pulseSubtle: 'animate-pulse-subtle',
  },
  spacing: {
    eventGap: 'gap-1',
    cellPadding: 'p-2 sm:p-3',
    eventPadding: 'px-1.5 py-0.5 sm:px-2 sm:py-1',
  },
  borderRadius: {
    event: 'rounded-md',
    cell: 'rounded-lg',
    button: 'rounded-lg',
  },
  shadows: {
    event: 'shadow-sm',
    eventHover: 'shadow-md',
    cellHover: 'shadow-sm',
  },
} as const

