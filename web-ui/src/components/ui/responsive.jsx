import React from 'react';
import { cn } from '../../lib/utils';

// Responsive Container Component
export const ResponsiveContainer = ({ 
  children, 
  className = '', 
  maxWidth = '7xl',
  padding = 'responsive'
}) => {
  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full'
  };

  const paddingClasses = {
    'none': '',
    'sm': 'px-4 py-2',
    'md': 'px-6 py-4',
    'lg': 'px-8 py-6',
    'responsive': 'px-4 sm:px-6 lg:px-8 py-4 sm:py-6'
  };

  return (
    <div className={cn(
      'mx-auto w-full',
      maxWidthClasses[maxWidth] || maxWidthClasses['7xl'],
      paddingClasses[padding] || paddingClasses['responsive'],
      className
    )}>
      {children}
    </div>
  );
};

// Responsive Grid Component
export const ResponsiveGrid = ({ 
  children, 
  className = '', 
  cols = { base: 1, sm: 2, md: 3, lg: 4 },
  gap = 'responsive'
}) => {
  const gapClasses = {
    'none': 'gap-0',
    'sm': 'gap-2',
    'md': 'gap-4',
    'lg': 'gap-6',
    'xl': 'gap-8',
    'responsive': 'gap-4 md:gap-6'
  };

  const gridCols = `grid-cols-${cols.base} ${cols.sm ? `sm:grid-cols-${cols.sm}` : ''} ${cols.md ? `md:grid-cols-${cols.md}` : ''} ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''} ${cols.xl ? `xl:grid-cols-${cols.xl}` : ''}`;

  return (
    <div className={cn(
      'grid',
      gridCols,
      gapClasses[gap] || gapClasses['responsive'],
      className
    )}>
      {children}
    </div>
  );
};

// Responsive Card Component
export const ResponsiveCard = ({ 
  children, 
  className = '', 
  hover = true,
  padding = 'responsive'
}) => {
  const paddingClasses = {
    'none': 'p-0',
    'sm': 'p-3',
    'md': 'p-4',
    'lg': 'p-6',
    'xl': 'p-8',
    'responsive': 'p-4 sm:p-6'
  };

  return (
    <div className={cn(
      'card-responsive',
      paddingClasses[padding] || paddingClasses['responsive'],
      hover && 'hover-lift',
      className
    )}>
      {children}
    </div>
  );
};

// Responsive Button Component
export const ResponsiveButton = ({ 
  children, 
  className = '', 
  variant = 'default',
  size = 'responsive',
  ...props
}) => {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline'
  };

  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8',
    responsive: 'btn-responsive'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium',
        'ring-offset-background transition-colors focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size] || sizes['responsive'],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// Responsive Input Component
export const ResponsiveInput = ({ 
  className = '', 
  type = 'text',
  ...props
}) => {
  return (
    <input
      type={type}
      className={cn(
        'input-responsive',
        className
      )}
      {...props}
    />
  );
};

// Responsive Text Component
export const ResponsiveText = ({ 
  children, 
  className = '', 
  as = 'p',
  size = 'base',
  weight = 'normal'
}) => {
  const Component = as;
  
  const sizes = {
    xs: 'text-responsive-xs',
    sm: 'text-responsive-sm',
    base: 'text-responsive-base',
    lg: 'text-responsive-lg',
    xl: 'text-responsive-xl',
    '2xl': 'text-responsive-2xl',
    '3xl': 'text-responsive-3xl'
  };

  const weights = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };

  return (
    <Component className={cn(
      sizes[size] || sizes['base'],
      weights[weight] || weights['normal'],
      className
    )}>
      {children}
    </Component>
  );
};

// Responsive Stack Component
export const ResponsiveStack = ({ 
  children, 
  className = '', 
  direction = 'col',
  spacing = 'responsive',
  align = 'stretch',
  justify = 'start'
}) => {
  const directions = {
    row: 'flex-row',
    col: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'col-reverse': 'flex-col-reverse',
    responsive: 'flex-col sm:flex-row'
  };

  const spacings = {
    none: '',
    sm: direction.includes('row') ? 'space-x-2' : 'space-y-2',
    md: direction.includes('row') ? 'space-x-4' : 'space-y-4',
    lg: direction.includes('row') ? 'space-x-6' : 'space-y-6',
    xl: direction.includes('row') ? 'space-x-8' : 'space-y-8',
    responsive: 'space-y-4 sm:space-y-0 sm:space-x-4'
  };

  const alignments = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
  };

  const justifications = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  return (
    <div className={cn(
      'flex',
      directions[direction] || directions['col'],
      spacings[spacing] || spacings['responsive'],
      alignments[align] || alignments['stretch'],
      justifications[justify] || justifications['start'],
      className
    )}>
      {children}
    </div>
  );
};

// Responsive Modal/Dialog Component
export const ResponsiveModal = ({ 
  children, 
  className = '', 
  isOpen,
  onClose,
  size = 'responsive'
}) => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    responsive: 'max-w-lg sm:max-w-xl md:max-w-2xl'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cn(
        'dialog-responsive',
        sizes[size] || sizes['responsive'],
        className
      )}>
        {children}
      </div>
    </div>
  );
};

// Responsive Table Component
export const ResponsiveTable = ({ 
  children, 
  className = '',
  ...props
}) => {
  return (
    <div className={cn('table-responsive', className)}>
      <table className="w-full caption-bottom text-sm" {...props}>
        {children}
      </table>
    </div>
  );
};

// Responsive Navigation Component
export const ResponsiveNav = ({ 
  children, 
  className = '',
  variant = 'horizontal'
}) => {
  const variants = {
    horizontal: 'flex flex-row space-x-4',
    vertical: 'flex flex-col space-y-2',
    responsive: 'flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4'
  };

  return (
    <nav className={cn(
      variants[variant] || variants['responsive'],
      className
    )}>
      {children}
    </nav>
  );
};

// Responsive Sidebar Component
export const ResponsiveSidebar = ({ 
  children, 
  className = '',
  isOpen = false,
  onClose
}) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        'sidebar-responsive',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        className
      )}>
        {children}
      </aside>
    </>
  );
};

// Responsive Image Component
export const ResponsiveImage = ({ 
  src, 
  alt, 
  className = '',
  aspectRatio = 'auto',
  objectFit = 'cover',
  ...props
}) => {
  const aspectRatios = {
    auto: '',
    square: 'aspect-square',
    video: 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '3/2': 'aspect-[3/2]',
    '16/9': 'aspect-[16/9]'
  };

  const objectFits = {
    contain: 'object-contain',
    cover: 'object-cover',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down'
  };

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'w-full h-auto',
        aspectRatios[aspectRatio],
        objectFits[objectFit],
        className
      )}
      {...props}
    />
  );
};

// Responsive Loading Component
export const ResponsiveLoading = ({ 
  className = '',
  size = 'md',
  text = 'Loading...'
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={cn('center-content flex-col space-y-2', className)}>
      <div className={cn(
        'loading-spinner',
        sizes[size] || sizes['md']
      )} />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
};

// Responsive Alert Component
export const ResponsiveAlert = ({ 
  children, 
  className = '',
  variant = 'default',
  icon
}) => {
  const variants = {
    default: 'bg-background text-foreground border',
    destructive: 'border-destructive/50 text-destructive dark:border-destructive',
    success: 'success-message',
    warning: 'warning-message',
    info: 'info-message'
  };

  return (
    <div className={cn(
      'relative w-full rounded-lg border p-4',
      variants[variant],
      className
    )}>
      {icon && (
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0">{icon}</div>
          <div className="flex-1">{children}</div>
        </div>
      )}
      {!icon && children}
    </div>
  );
};
